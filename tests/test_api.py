"""Local API regression tests; no credentials or external requests required."""
import unittest
from unittest.mock import patch

import app as backend


LOCAL_CONFIG = {
    "dashscope_api_key": "",
    "dashscope_model": "qwen-plus",
    "iflytek": {"appid": "", "api_key": "", "api_secret": "", "voice_name": "xiaoyan"},
}


class ApiRegressionTests(unittest.TestCase):
    def setUp(self):
        config_patch = patch.object(backend, "load_config", return_value=LOCAL_CONFIG)
        config_patch.start()
        self.addCleanup(config_patch.stop)
        self.client = backend.app.test_client()

    def test_local_guides_explanations_and_assets(self):
        for scene in backend.SCENES["scenes"]:
            for age in backend._AGES:
                for lang in backend._LANGS:
                    with self.subTest(scene=scene["id"], age=age, lang=lang):
                        response = self.client.post("/api/guide", json={
                            "scene_id": scene["id"], "age": age, "lang": lang,
                        })
                        self.assertEqual(response.status_code, 200)
                        self.assertTrue(response.json["text"])
                        self.assertEqual(response.json["mode"], "local")
            for asset in (scene["panorama"], scene["panorama"].replace(".jpg", "_preview.jpg")):
                with self.subTest(asset=asset), self.client.get(asset) as response:
                    self.assertEqual(response.status_code, 200)
        for keyword in backend.KEYWORDS["keywords"]:
            for lang in backend._LANGS:
                with self.subTest(keyword=keyword, lang=lang):
                    response = self.client.post("/api/explain", json={"keyword": keyword, "lang": lang})
                    self.assertEqual(response.status_code, 200)
                    self.assertTrue(response.json["text"])

    def test_every_localized_keyword_is_searchable(self):
        for keyword, record in backend.KEYWORDS["keywords"].items():
            for lang, term in record["term"].items():
                with self.subTest(keyword=keyword, lang=lang):
                    response = self.client.post("/api/ask", json={"question": term, "lang": lang})
                    self.assertEqual(response.status_code, 200)
                    self.assertIn(record["definition"][lang], response.json["answer"])

    def test_keyword_aliases_case_spacing_and_word_boundaries(self):
        expected = backend.KEYWORDS["keywords"]["huangdi"]["definition"]["en"]
        for question in ("Who is XUANYUAN?", "Tell me about the Yellow   Emperor."):
            with self.subTest(question=question):
                self.assertIn(expected, backend._local_ask(question, "en"))
        self.assertEqual(backend._local_ask("I enjoy reading", "en"), backend._ASK_FALLBACK["en"])

    def test_invalid_request_bodies_return_json_400(self):
        for route in ("guide", "explain", "ask", "tts"):
            for payload in ("[]", "null", "123", '"text"', "{broken", ""):
                with self.subTest(route=route, payload=payload):
                    response = self.client.post("/api/" + route, data=payload, content_type="application/json")
                    self.assertEqual(response.status_code, 400)
                    self.assertIsInstance(response.json["error"], str)

    def test_invalid_fields_return_json_400(self):
        cases = [
            ("guide", {"scene_id": []}), ("guide", {"age": {}}),
            ("guide", {"age": "unknown"}), ("guide", {"lang": "fr"}),
            ("explain", {"keyword": ["huangdi"]}), ("explain", {"keyword": " "}),
            ("ask", {"question": 123}), ("ask", {"question": None}),
            ("ask", {"question": "x" * 121}), ("ask", {"question": " "}),
            ("ask", {"question": "hello", "lang": []}),
            ("tts", {"text": 123}), ("tts", {"text": "x" * 8001}),
            ("tts", {"text": "hello", "lang": None}),
        ]
        for route, payload in cases:
            with self.subTest(route=route, payload=payload):
                response = self.client.post("/api/" + route, json=payload)
                self.assertEqual(response.status_code, 400)
                self.assertIsInstance(response.json["error"], str)

    def test_defaults_and_unknown_ids(self):
        response = self.client.post("/api/guide", json={})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["lang"], "zh")
        self.assertEqual(self.client.post("/api/guide", json={"scene_id": "missing"}).status_code, 404)
        self.assertEqual(self.client.post("/api/explain", json={"keyword": "missing"}).status_code, 404)

    def test_browser_tts_fallback(self):
        for lang in backend._LANGS:
            with self.subTest(lang=lang):
                response = self.client.post("/api/tts", json={"text": "demo", "lang": lang})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json["mode"], "browser")


if __name__ == "__main__":
    unittest.main()
