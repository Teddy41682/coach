"""Tests for tools/replay.py — run: python3 -m unittest tools/test_replay.py"""
import pathlib, sys, tempfile, unittest
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from PIL import Image, ImageEnhance
import replay


def jpeg(path, colour, size=(504, 896), box=None):
    im = Image.new("RGB", size, colour)
    if box:
        im.paste((200, 200, 200), box)
    im.save(path, quality=80)
    return path


class Thumbs(unittest.TestCase):
    def setUp(self):
        self.dir = pathlib.Path(tempfile.mkdtemp())

    def test_an_image_against_itself_is_no_change(self):
        a = replay.thumb(jpeg(self.dir / "a.jpg", (90, 60, 30), box=(0, 0, 200, 300)))
        self.assertEqual(len(a), replay.THUMB * replay.THUMB)
        self.assertEqual(replay.diff(a, a), 0)

    def test_a_brighter_exposure_of_the_same_scene_is_almost_no_change(self):
        p = jpeg(self.dir / "a.jpg", (90, 60, 30), box=(0, 0, 200, 300))
        Image.open(p).point(lambda v: min(255, v + 25)).save(self.dir / "b.jpg")
        self.assertLess(replay.diff(replay.thumb(p), replay.thumb(self.dir / "b.jpg")), 0.02)

    def test_a_different_scene_is_a_change(self):
        a = replay.thumb(jpeg(self.dir / "a.jpg", (90, 60, 30), box=(0, 0, 250, 896)))
        b = replay.thumb(jpeg(self.dir / "b.jpg", (90, 60, 30), box=(254, 0, 504, 896)))
        self.assertGreater(replay.diff(a, b), replay.CHANGE)


SAME = [100] * 64
OTHER = [0] * 32 + [200] * 32


class EyesTests(unittest.TestCase):
    def test_the_first_look_wakes_the_mind(self):
        self.assertEqual(replay.Eyes().look(0, SAME), "changed")

    def test_the_same_picture_never_wakes_it_until_the_heartbeat(self):
        e = replay.Eyes(); e.woke(0, SAME)
        self.assertIsNone(e.look(10, SAME))
        self.assertIsNone(e.look(29.5, SAME))
        self.assertEqual(e.look(30, SAME), "heartbeat")

    def test_a_change_wakes_it_once_the_picture_is_steady(self):
        e = replay.Eyes(); e.woke(0, SAME)
        self.assertIsNone(e.look(5, OTHER))        # just changed: not steady for a second yet
        self.assertIsNone(e.look(5.5, OTHER))
        self.assertEqual(e.look(6.0, OTHER), "changed")

    def test_a_picture_still_moving_does_not_wake_it(self):
        e = replay.Eyes(); e.woke(0, SAME)
        moving = [[(i * 37 + k * 50) % 256 for i in range(64)] for k in range(12)]
        self.assertEqual([e.look(5 + k * 0.5, m) for k, m in enumerate(moving)], [None] * 12)

    def test_eye_wakes_are_at_least_two_and_a_half_seconds_apart(self):
        e = replay.Eyes(); e.woke(0, SAME)
        for t in (0.5, 1.0): e.look(t, OTHER)
        self.assertIsNone(e.look(1.5, OTHER))      # steady and changed, but too soon after the last wake
        self.assertEqual(e.look(2.5, OTHER), "changed")

    def test_nothing_while_a_call_is_in_flight(self):
        e = replay.Eyes()
        self.assertIsNone(e.look(0, SAME, busy=True))


class GuardrailTests(unittest.TestCase):
    def test_never_over_the_cook_or_itself_once_in_twenty_seconds_and_not_after_finishing(self):
        g = replay.Guardrails()
        self.assertFalse(g.allows(10, cook_speaking=True, coach_speaking=False, finished=False))
        self.assertFalse(g.allows(10, cook_speaking=False, coach_speaking=True, finished=False))
        self.assertTrue(g.allows(10, cook_speaking=False, coach_speaking=False, finished=False))
        g.spoke(10)
        self.assertFalse(g.allows(29, cook_speaking=False, coach_speaking=False, finished=False))
        self.assertTrue(g.allows(30, cook_speaking=False, coach_speaking=False, finished=False))
        self.assertFalse(g.allows(90, cook_speaking=False, coach_speaking=False, finished=True))


class IntentTests(unittest.TestCase):
    def test_navigation_matches_the_phone(self):
        self.assertEqual(replay.intent("OK shall we move onto the next step"), "next")
        self.assertEqual(replay.intent("What's next"), "next")
        self.assertEqual(replay.intent("OK"), "ignore")
        self.assertEqual(replay.intent("So done"), "done")
        self.assertEqual(replay.intent("How much salt should I do"), "question")


class TimelineTests(unittest.TestCase):
    def test_lines_are_timed_and_capped(self):
        t = replay.Timeline()
        t.add(65, "cook", "is it done?")
        t.add(70, "saw", "x" * 300)
        self.assertEqual(t.lines()[0], "1:05 cook: is it done?")
        self.assertLessEqual(len(t.lines()[1]), 200)


if __name__ == "__main__":
    unittest.main()
