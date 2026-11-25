"""Small, dependency-free mail endpoint, bound to loopback behind Nginx."""

import argparse
from collections import OrderedDict
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import logging
import os
from pathlib import Path
import re
import smtplib
import ssl
import threading
import time


EMAIL = re.compile(r"[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\Z")
MAX_BODY = 16384
logger = logging.getLogger("h7septima.brief")


def load_env(path):
    """Read the same simple KEY=value format used by systemd EnvironmentFile."""
    if not Path(path).exists():
        return
    for line in Path(path).read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Z_][A-Z0-9_]*", key):
            raise ValueError("Invalid environment file")
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key, value)


def validate(data):
    if not isinstance(data, dict):
        return None, {"form": "Проверьте заполнение формы."}
    result = {}
    errors = {}
    limits = {"name": (2, 80), "contact": (1, 150), "project": (10, 3000)}
    for key, (minimum, maximum) in limits.items():
        value = data.get(key)
        value = value.strip() if isinstance(value, str) else ""
        if not minimum <= len(value) <= maximum or "\x00" in value:
            errors[key] = {
                "name": "Напишите имя: от 2 до 80 символов.",
                "contact": "Укажите удобный способ связи: до 150 символов.",
                "project": "Опишите проект: от 10 до 3000 символов.",
            }[key]
        result[key] = value
    if any(char in result["name"] for char in "\r\n"):
        errors["name"] = "Напишите имя в одну строку."
    return result, errors


def send_mail(brief, config):
    required = ("SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "MAIL_FROM", "MAIL_TO")
    if any(not config.get(key) for key in required):
        raise RuntimeError("Mail is not configured")
    if any(not EMAIL.fullmatch(config[key]) for key in ("MAIL_FROM", "MAIL_TO")):
        raise RuntimeError("Invalid mail configuration")
    port = int(config.get("SMTP_PORT", "465"))
    if port not in (465, 587):
        raise RuntimeError("Use SMTP over TLS on port 465 or 587")
    message = EmailMessage()
    message["From"] = "H7 Септима <{}>".format(config["MAIL_FROM"])
    message["To"] = config["MAIL_TO"]
    message["Subject"] = "Новая заявка с h7septima.ru"
    message["Date"] = formatdate(localtime=False)
    message["Message-ID"] = make_msgid(domain="h7septima.ru")
    if EMAIL.fullmatch(brief["contact"]):
        message["Reply-To"] = brief["contact"]
    message.set_content("\n".join((
        "Новая заявка с сайта H7 Септима", "",
        "Имя: " + brief["name"], "Контакт: " + brief["contact"],
        "", "О проекте:", brief["project"],
    )))
    context = ssl.create_default_context()
    if port == 465:
        connection = smtplib.SMTP_SSL(config["SMTP_HOST"], port, timeout=15, context=context)
    else:
        connection = smtplib.SMTP(config["SMTP_HOST"], port, timeout=15)
    with connection as smtp:
        if port == 587:
            smtp.starttls(context=context)
        smtp.login(config["SMTP_USERNAME"], config["SMTP_PASSWORD"])
        smtp.send_message(message)


class RateLimit:
    def __init__(self):
        self.clients = OrderedDict()
        self.lock = threading.Lock()

    def allow(self, key):
        now = time.monotonic()
        with self.lock:
            while self.clients and next(iter(self.clients.values()))[0] <= now - 600:
                self.clients.popitem(last=False)
            entry = self.clients.get(key)
            if entry and entry[1] >= 5:
                return False
            # Bound memory even when many different addresses hit the endpoint.
            if not entry and len(self.clients) >= 4096:
                return False
            self.clients[key] = (entry[0], entry[1] + 1) if entry else (now, 1)
            return True


def make_server(config, sender=send_mail, port=4174):
    limiter = RateLimit()
    slots = threading.BoundedSemaphore(4)
    origins = set(config.get("ALLOWED_ORIGINS", "https://h7septima.ru").split(","))

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(20)

        def reply(self, status, body):
            encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            if status == 429:
                self.send_header("Retry-After", "600")
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self):
            self.reply(405, {"ok": False, "message": "Используйте форму на сайте."})

        def do_POST(self):
            if self.path != "/api/brief":
                self.reply(404, {"ok": False})
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                size = 0
            # Consume a bounded request before replying, avoiding TCP resets on
            # validation failures. Nginx rejects larger bodies in production.
            raw = self.rfile.read(min(size, MAX_BODY + 1)) if size > 0 else b""
            if not 0 < size <= MAX_BODY:
                self.reply(413, {"ok": False, "message": "Слишком много данных. Сократите описание проекта."})
                return
            if self.headers.get("Origin") not in origins:
                self.reply(403, {"ok": False, "message": "Отправьте заявку с сайта студии."})
                return
            if self.headers.get_content_type() != "application/json":
                self.reply(415, {"ok": False, "message": "Обновите страницу и попробуйте ещё раз."})
                return
            client = self.headers.get("X-Real-IP", self.client_address[0])
            if not limiter.allow(client):
                self.reply(429, {"ok": False, "message": "Слишком много попыток. Попробуйте через 10 минут."})
                return
            try:
                data = json.loads(raw)
            except (ValueError, UnicodeError):
                self.reply(400, {"ok": False, "message": "Проверьте заполнение формы."})
                return
            # Hidden honeypot: reject bot input without sending any mail.
            if isinstance(data, dict) and data.get("website"):
                self.reply(400, {"ok": False, "message": "Обновите страницу и попробуйте ещё раз."})
                return
            brief, errors = validate(data)
            if errors:
                self.reply(400, {"ok": False, "message": "Проверьте выделенные поля.", "errors": errors})
                return
            if not slots.acquire(blocking=False):
                self.reply(503, {"ok": False, "message": "Сервис занят. Попробуйте через минуту."})
                return
            try:
                sender(brief, config)
            except Exception as error:
                # Do not log credentials, contact details, or SMTP response text.
                logger.error("Mail submission failed: %s", type(error).__name__)
                self.reply(503, {"ok": False, "message": "Не удалось отправить заявку. Ваш текст сохранён в форме. Попробуйте позже или напишите на info@h7septima.ru."})
            else:
                self.reply(200, {"ok": True})
            finally:
                slots.release()

        def log_message(self, format, *args):
            logger.info("HTTP %s", args[1] if len(args) > 1 else "request")

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default=".env")
    args = parser.parse_args()
    load_env(args.env_file)
    logging.basicConfig(level=logging.INFO)
    server = make_server(dict(os.environ), port=int(os.environ.get("BRIEF_PORT", "4174")))
    logger.info("Brief endpoint listening on 127.0.0.1:%s", server.server_port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
