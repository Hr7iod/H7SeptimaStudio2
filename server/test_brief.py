from email import policy
from email.parser import BytesParser
from http.client import HTTPConnection
import json
import smtplib
import threading
import unittest
from unittest.mock import patch

from brief import make_server, send_mail


CONFIG = {
    "SMTP_HOST": "smtp.yandex.ru", "SMTP_PORT": "465",
    "SMTP_USERNAME": "studio@example.com", "SMTP_PASSWORD": "test-password",
    "MAIL_FROM": "studio@example.com", "MAIL_TO": "owner@example.com",
    "ALLOWED_ORIGINS": "https://h7septima.ru",
}
BRIEF = {
    "name": "Анна", "contact": "anna@example.com",
    "project": "Нужен каталог услуг для мастерской.\nВторая строка описания.",
}


class MailEndpointTests(unittest.TestCase):
    def setUp(self):
        self.messages = []
        self.failure = None

        def sender(brief, config):
            if self.failure:
                raise self.failure
            self.messages.append(brief)

        self.server = make_server(CONFIG, sender=sender, port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def post(self, data=BRIEF, **headers):
        connection = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        body = data if isinstance(data, str) else json.dumps(data)
        connection.request("POST", "/api/brief", body=body, headers={
            "Origin": "https://h7septima.ru", "Content-Type": "application/json", **headers,
        })
        response = connection.getresponse()
        result = response.status, json.loads(response.read())
        connection.close()
        return result

    def test_success_preserves_visible_form_fields(self):
        status, body = self.post()
        self.assertEqual((status, body), (200, {"ok": True}))
        self.assertEqual(self.messages, [BRIEF])

    def test_missing_or_oversized_contact_cannot_send(self):
        for contact in ("", "   ", "x" * 151):
            status, body = self.post({**BRIEF, "contact": contact})
            self.assertEqual(status, 400)
            self.assertIn("contact", body["errors"])
        self.assertEqual(self.messages, [])

    def test_contact_accepts_any_preferred_method(self):
        for contact in ("+7 900 123-45-67", "WhatsApp: 89001234567, после 18:00", "MAX: Анна", "x"):
            with self.subTest(contact=contact):
                self.assertEqual(self.post({**BRIEF, "contact": contact})[0], 200)
                self.assertEqual(self.messages[-1]["contact"], contact)

    def test_stale_hidden_task_is_ignored(self):
        self.assertEqual(self.post({**BRIEF, "task": "Нужен новый сайт"})[0], 200)
        self.assertEqual(self.messages, [BRIEF])

    def test_bad_payload_and_spam_do_not_send(self):
        for data in ("{", [], {**BRIEF, "website": "spam"}, {**BRIEF, "project": "x" * 3001}):
            self.assertEqual(self.post(data)[0], 400)
        self.assertEqual(self.messages, [])

    def test_cross_origin_and_non_json_do_not_send(self):
        self.assertEqual(self.post(Origin="https://other.example")[0], 403)
        self.assertEqual(self.post(**{"Content-Type": "text/plain"})[0], 415)
        self.assertEqual(self.messages, [])

    def test_mail_failure_never_reports_success(self):
        self.failure = smtplib.SMTPAuthenticationError(535, b"private smtp details")
        with self.assertLogs("h7septima.brief", level="ERROR") as logs:
            status, body = self.post()
        self.assertEqual(status, 503)
        self.assertFalse(body["ok"])
        self.assertNotIn("private smtp details", "".join(logs.output))

    def test_rate_limit_and_body_limit(self):
        for _ in range(5):
            self.assertEqual(self.post()[0], 200)
        self.assertEqual(self.post()[0], 429)
        self.assertEqual(self.post("x" * 16385)[0], 413)
        self.assertEqual(len(self.messages), 5)


class SmtpTests(unittest.TestCase):
    @patch("brief.smtplib.SMTP_SSL")
    def test_tls_recipient_reply_to_and_utf8_body(self, smtp_class):
        send_mail(BRIEF, CONFIG)
        smtp = smtp_class.return_value.__enter__.return_value
        smtp.login.assert_called_once_with("studio@example.com", "test-password")
        message = smtp.send_message.call_args.args[0]
        # Round-trip the actual wire representation, including MIME encoding.
        parsed = BytesParser(policy=policy.default).parsebytes(message.as_bytes())
        self.assertEqual(parsed["To"], "owner@example.com")
        self.assertEqual(parsed["Reply-To"], "anna@example.com")
        self.assertIn(BRIEF["project"], parsed.get_content())
        self.assertNotIn("Задача:", parsed.get_content())
        self.assertEqual(smtp_class.call_args.args[1], 465)
        self.assertTrue(smtp_class.call_args.kwargs["context"].check_hostname)

    @patch("brief.smtplib.SMTP_SSL")
    def test_freeform_contact_stays_out_of_mail_headers(self, smtp_class):
        contact = "WhatsApp: +7 900 123-45-67\nBcc: other@example.com"
        send_mail({**BRIEF, "contact": contact, "task": "Нужен новый сайт"}, CONFIG)
        message = smtp_class.return_value.__enter__.return_value.send_message.call_args.args[0]
        self.assertNotIn("Reply-To", message)
        self.assertNotIn("Bcc", message)
        self.assertIn(contact, message.get_content())
        self.assertNotIn("Задача:", message.get_content())
        self.assertNotIn("Нужен новый сайт", message.get_content())

    @patch("brief.smtplib.SMTP_SSL")
    def test_missing_password_cannot_connect(self, smtp_class):
        with self.assertRaises(RuntimeError):
            send_mail(BRIEF, {**CONFIG, "SMTP_PASSWORD": ""})
        smtp_class.assert_not_called()


if __name__ == "__main__":
    unittest.main()
