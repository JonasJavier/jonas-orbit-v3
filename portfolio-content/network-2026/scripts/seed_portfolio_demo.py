"""Seed a *separate*, local-only demo database for portfolio screenshots.

Why this exists instead of `python manage.py seed`
--------------------------------------------------
The repository's own seed command (backend/apps/core/management/commands/seed.py)
creates eight accounts named after real, identifiable people (Ada Lovelace,
Grace Hopper, Linus Torvalds, ...). Portfolio screenshots must not show real
people's names, so this script seeds the same *kinds* of data with entirely
invented people. It touches no file inside the Network repository.

Isolation
---------
Nothing is written to the repo's dev database or media folder. Both are chosen
by environment variable:

    NETWORK_BACKEND   absolute path to <repo>/backend        (required)
    DATABASE_URL      sqlite:///<abs path>/demo.sqlite3      (required)
    MEDIA_ROOT        <abs path>/media                       (required)

Run
---
    cd <repo>/backend
    NETWORK_BACKEND=... DATABASE_URL=... MEDIA_ROOT=... python <this file>

The script is idempotent: it deletes every row it owns and rebuilds from
scratch, so two runs produce the same data (fixed RNG seed, timestamps
relative to a single "now" captured at start).

Avatars and covers are generated procedurally (gradient + initials), never
photographs of people. All post text, names and numbers are synthetic demo
content and are not presented anywhere as real metrics.
"""

from __future__ import annotations

import io
import math
import os
import random
import sys
from datetime import timedelta
from pathlib import Path

BACKEND = os.environ.get("NETWORK_BACKEND")
if not BACKEND:
    sys.exit("NETWORK_BACKEND must point at <repo>/backend")
sys.path.insert(0, str(Path(BACKEND).resolve()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.core.files.base import ContentFile  # noqa: E402
from django.db import transaction  # noqa: E402
from django.utils import timezone  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

from apps.notifications.models import Notification  # noqa: E402
from apps.posts.models import Bookmark, Comment, Hashtag, Post, PostLike  # noqa: E402
from apps.posts.services import notify_mentions, sync_hashtags  # noqa: E402
from apps.users.models import Follow  # noqa: E402

User = get_user_model()
Verb = Notification.Verb

DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "PortfolioDemo!2026")
NOW = timezone.now()
RNG = random.Random(2026)
IMG_RNG = random.Random(11)

# ---------------------------------------------------------------------------
# Procedural imagery - abstract gradients, never photos of people.
# The visual language mirrors the repo's own seed command; the gradient is
# rendered small and upscaled so a full run takes seconds instead of minutes.
# ---------------------------------------------------------------------------

PALETTES = [
    ((79, 70, 229), (168, 85, 247)),
    ((14, 165, 233), (34, 211, 238)),
    ((16, 185, 129), (45, 212, 191)),
    ((244, 63, 94), (251, 146, 60)),
    ((139, 92, 246), (217, 70, 239)),
    ((245, 158, 11), (250, 204, 21)),
    ((37, 99, 235), (129, 140, 248)),
    ((5, 150, 105), (132, 204, 22)),
]


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, start, end, angle_deg=35):
    """Linear gradient: rendered at low resolution, then upscaled."""
    small = (96, 64)
    image = Image.new("RGB", small)
    pixels = image.load()
    angle = math.radians(angle_deg)
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    span = abs(small[0] * cos_a) + abs(small[1] * sin_a)
    for y in range(small[1]):
        for x in range(small[0]):
            t = (x * cos_a + y * sin_a) / span
            pixels[x, y] = _lerp(start, end, max(0.0, min(1.0, t)))
    return image.resize(size, Image.Resampling.LANCZOS)


def abstract_image(size, palette):
    """Gradient plus translucent geometry - reads as an abstract photo."""
    image = gradient(size, *palette, angle_deg=IMG_RNG.randint(15, 75)).convert("RGBA")
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = size
    for _ in range(IMG_RNG.randint(4, 7)):
        radius = IMG_RNG.randint(width // 8, width // 3)
        x, y = IMG_RNG.randint(-radius // 2, width), IMG_RNG.randint(-radius // 2, height)
        alpha = IMG_RNG.randint(40, 110)
        tint = (255, 255, 255, alpha) if IMG_RNG.random() > 0.35 else (0, 0, 0, alpha // 2)
        if IMG_RNG.random() > 0.5:
            draw.ellipse([x, y, x + radius, y + radius], fill=tint)
        else:
            draw.polygon(
                [
                    (x, y),
                    (x + radius, y + IMG_RNG.randint(0, radius)),
                    (x + IMG_RNG.randint(0, radius), y + radius),
                ],
                fill=tint,
            )
    return Image.alpha_composite(image, overlay).convert("RGB")


def avatar_image(initials, palette):
    image = abstract_image((512, 512), palette)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=200)
    draw.text((256, 256), initials, fill=(255, 255, 255), font=font, anchor="mm")
    return image


def content_file(image, name):
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=82)
    return ContentFile(buffer.getvalue(), name=name)


# ---------------------------------------------------------------------------
# Cast - invented people. Any resemblance to a real person is unintended.
# (username, first, last, headline, location, bio, website, joined_days_ago)
# ---------------------------------------------------------------------------

PEOPLE = [
    (
        "mira.kessel",
        "Mira",
        "Kessel",
        "Staff Engineer - Platform & Distributed Systems",
        "Rotterdam, NL",
        "I build the boring infrastructure the interesting products stand on. "
        "Currently thinking about backpressure and queue depth.",
        "https://example.dev/mira",
        420,
    ),
    (
        "tobi.okonkwo",
        "Tobi",
        "Okonkwo",
        "Frontend Engineer - Design Systems",
        "Lagos, NG",
        "Components, tokens and accessibility. Allergic to div soup.",
        "https://example.dev/tobi",
        390,
    ),
    (
        "nadia.vrolijk",
        "Nadia",
        "Vrolijk",
        "Site Reliability Engineer",
        "Utrecht, NL",
        "On-call should not be heroic. Dashboards, error budgets, sleep.",
        "",
        355,
    ),
    (
        "samir.haddad",
        "Samir",
        "Haddad",
        "Data Engineer - Streaming",
        "Beirut, LB",
        "Pipelines that do not wake anybody up. Exactly-once is a lie we tell ourselves.",
        "",
        330,
    ),
    (
        "june.calloway",
        "June",
        "Calloway",
        "Engineering Manager",
        "Austin, TX",
        "Fewer meetings, clearer writing, shorter feedback loops.",
        "https://example.dev/june",
        300,
    ),
    (
        "priya.raman",
        "Priya",
        "Raman",
        "Security Engineer - AppSec",
        "Bengaluru, IN",
        "Threat models over checklists. Ask me about token rotation.",
        "",
        265,
    ),
    (
        "luca.marchetti",
        "Luca",
        "Marchetti",
        "Mobile Engineer - Android",
        "Milan, IT",
        "Offline-first, always. Battery is a feature.",
        "",
        230,
    ),
    (
        "zoe.aberdeen",
        "Zoe",
        "Aberdeen",
        "Product Designer",
        "Edinburgh, UK",
        "Interface design for dense, data-heavy products. Empty states are a design problem.",
        "https://example.dev/zoe",
        195,
    ),
    (
        "felix.nakamura",
        "Felix",
        "Nakamura",
        "Platform Engineer - Kubernetes",
        "Osaka, JP",
        "Making deploys boring since forever.",
        "",
        160,
    ),
    # A deliberately brand-new account, used to photograph the empty states.
    ("noah.fielding", "Noah", "Fielding", "", "", "", "", 0),
]

HERO = "mira.kessel"  # the account most screenshots are taken from
NEWCOMER = "noah.fielding"

# Everyone except the newcomer gets an avatar; a subset also gets a cover.
WITH_COVER = {"mira.kessel", "tobi.okonkwo", "june.calloway", "zoe.aberdeen"}

# (username, content, has_image, hours_ago)
POSTS = [
    (
        "mira.kessel",
        "Spent the week replacing a polling loop with a proper queue and the p99 dropped from "
        "1.8s to 210ms. The fix was not clever code - it was admitting the old design was "
        "wrong. #distributed #backend",
        True,
        3,
    ),
    (
        "zoe.aberdeen",
        "Reminder that an empty state is the first screen most people see. If it only says "
        "\"No data\", you shipped half a feature. Say what goes here and how to get it. "
        "#design #ux",
        False,
        5,
    ),
    (
        "tobi.okonkwo",
        "Migrated our button component to design tokens today. 14 one-off shades of grey "
        "became 4. The diff deletes more than it adds, which is my favourite kind. "
        "#frontend #designsystems",
        True,
        7,
    ),
    (
        "nadia.vrolijk",
        "Error budgets changed how we argue. \"Is this risky?\" turned into \"do we have budget "
        "for it this month?\" - same conversation, far less shouting. #sre #reliability",
        False,
        9,
    ),
    (
        "priya.raman",
        "If your refresh tokens never rotate, a single leaked token is a permanent key. "
        "Rotate on use, blacklist the old one, and log the reuse. #security #appsec",
        False,
        11,
    ),
    (
        "samir.haddad",
        "Cursor pagination over offset pagination, every time a list can change while you read "
        "it. Page 2 of an offset query is a lie the moment someone posts. #backend #databases",
        False,
        13,
    ),
    (
        "june.calloway",
        "Ran our first written-first design review. No deck, no live demo - a two-page doc read "
        "in silence for ten minutes, then discussion. Best review we have had. #leadership",
        False,
        16,
    ),
    (
        "felix.nakamura",
        "Deploys got boring this quarter and I could not be prouder. Health checks, one "
        "rollback command, no heroes. #devops #kubernetes",
        True,
        19,
    ),
    (
        "luca.marchetti",
        "Offline-first is not a feature you bolt on. It is a data model decision you make on "
        "day one, and it changes every screen after that. #mobile #android",
        False,
        22,
    ),
    (
        "mira.kessel",
        "Question I ask in every design review now: what does this do when the dependency is "
        "slow, not down? Slow is harder and far more common. cc @nadia.vrolijk #distributed",
        True,
        26,
    ),
    (
        "zoe.aberdeen",
        "Skeleton loaders beat spinners when you know the shape of what is coming. They also "
        "keep the layout from jumping, which is the real win. #design #frontend",
        True,
        30,
    ),
    (
        "nadia.vrolijk",
        "Postmortem template we actually use: timeline, contributing factors, what we changed. "
        "No names, no blame, no \"be more careful\" action items. #sre",
        False,
        34,
    ),
    (
        "tobi.okonkwo",
        "Keyboard navigation is not an accessibility extra, it is how power users work. "
        "Tab order, focus rings, a \"/\" to focus search. Cheap to add, hard to retrofit. "
        "#accessibility #frontend",
        False,
        38,
    ),
    (
        "samir.haddad",
        "Data quality beats model complexity, again. Two days cleaning the source and the "
        "simple model now wins. Nobody writes conference talks about this part. #data",
        True,
        43,
    ),
    (
        "priya.raman",
        "Rate-limit the credential endpoints separately from everything else. Login, register "
        "and password change deserve their own, much tighter bucket. #security",
        False,
        48,
    ),
    (
        "june.calloway",
        "Hiring note: I stopped asking for \"passion\" and started asking candidates to explain "
        "a bug they did not solve. Much better signal. #hiring #leadership",
        False,
        53,
    ),
    (
        "mira.kessel",
        "Read of the week: an old paper on backpressure in dataflow systems. Everything we "
        "rediscover in distributed systems was written down decades ago. #distributed",
        True,
        58,
    ),
    (
        "felix.nakamura",
        "A health endpoint that only returns 200 is decoration. Check the database, report the "
        "cache separately, and never fail the probe because a cache is cold. #devops",
        False,
        64,
    ),
    (
        "luca.marchetti",
        "Shipped image uploads with a client-side resize before upload. Payload down 80%, and "
        "the server still re-encodes because you never trust the client. #mobile",
        True,
        70,
    ),
    (
        "zoe.aberdeen",
        "Dark mode is not inverted light mode. Shadows stop working, borders carry the "
        "hierarchy, and your brand colour probably needs a lighter variant. #design",
        False,
        76,
    ),
    (
        "tobi.okonkwo",
        "Optimistic updates feel instant right up until the request fails. Always write the "
        "rollback path at the same time as the happy path. Good thread by @mira.kessel on "
        "this. #frontend",
        False,
        82,
    ),
    (
        "nadia.vrolijk",
        "Structured logs to stdout, let the platform collect them. Every log file on a "
        "container's disk is a log you will lose. #sre #devops",
        False,
        89,
    ),
    (
        "samir.haddad",
        "Indexes are a design decision, not an optimisation you sprinkle on later. Write the "
        "query first, then the index it needs, then the test that proves it. #databases",
        False,
        96,
    ),
    (
        "june.calloway",
        "Three-week projects finish. Three-month projects change scope twice and finish in six. "
        "Slice harder. #leadership",
        True,
        104,
    ),
    (
        "priya.raman",
        "Strip EXIF from every uploaded image. People do not expect their holiday photo to "
        "carry GPS coordinates into your database. #security #privacy",
        False,
        112,
    ),
    (
        "mira.kessel",
        "Small thing that saved us hours: a single seed command that produces the same demo "
        "data every time. Reviewers stop asking \"what am I looking at?\" #engineering",
        True,
        120,
    ),
    (
        "felix.nakamura",
        "Multi-stage Docker builds took our image from 1.2 GB to 180 MB. The build cache does "
        "the rest. #docker #devops",
        False,
        129,
    ),
    (
        "luca.marchetti",
        "Accessibility audit found our tap targets were 32px. Guideline is 44. Two lines of "
        "CSS, measurably fewer mis-taps. #mobile #accessibility",
        False,
        138,
    ),
    (
        "zoe.aberdeen",
        "Good confirmation dialogs name the consequence, not the action. \"Delete 3 posts\" "
        "beats \"Are you sure?\" every single time. #design #ux",
        False,
        147,
    ),
    (
        "nadia.vrolijk",
        "Graceful degradation, concretely: if the cache is unreachable the app gets slower, "
        "not broken. Write the fallback and then unplug the cache to prove it. #sre",
        True,
        156,
    ),
    # The hero needs enough image posts to fill the profile media grid, which
    # lays out three per row - two tiles in an empty row looks unfinished.
    (
        "mira.kessel",
        "The load-shedding diagram that finally made the design click for the team. One "
        "bounded buffer, one drop policy, one metric. #distributed #backend",
        True,
        90,
    ),
    (
        "mira.kessel",
        "Queue depth two weeks after the rewrite. Flat is beautiful. Posting it here so I "
        "remember what good looks like next time it is not. #distributed",
        True,
        135,
    ),
]

# (author, index of the post being quoted, quote text, hours_ago)
#
# Timing matters: a repost renders as a full copy of the original with a
# "X reposted" header, and the feed does not de-duplicate. If a repost sits an
# hour after the post it copies, the two land next to each other and read as a
# rendering bug. Real usage spreads them out, so the demo data does too - see
# features.md, which documents the underlying behaviour.
QUOTES = [
    (
        "tobi.okonkwo",
        1,
        "This is why our design system ships an EmptyState component with required title and "
        "description props. You cannot forget the copy if the API will not let you. "
        "#designsystems",
        1,
    ),
    (
        "mira.kessel",
        5,
        "Cursor pagination is the single change that made our feed stop double-showing posts. "
        "Worth the extra day it costs to implement. #backend",
        4,
    ),
    (
        "priya.raman",
        18,
        "And re-encode server-side even when the client already did. The client is an input, "
        "not an authority. #security",
        33,
    ),
    (
        "june.calloway",
        9,
        "Adding this question to our review template. \"Slow, not down\" is where most of our "
        "incidents actually start. #leadership",
        10,
    ),
]

# (author, index of the post being reposted, hours_ago)
REPOSTS = [
    ("nadia.vrolijk", 15, 2),
    # Someone has to repost one of the hero's posts, otherwise their
    # notification list is missing the "reposted your post" case.
    ("priya.raman", 16, 5),
    ("june.calloway", 12, 6),
    ("mira.kessel", 19, 8),
    ("felix.nakamura", 22, 15),
    ("zoe.aberdeen", 24, 40),
    ("samir.haddad", 27, 62),
]

COMMENTS = [
    "We hit exactly this last quarter - the queue was the answer for us too.",
    "Do you have the numbers written up anywhere? Would love to read the detail.",
    "Strong agree. The hard part is convincing people the old design was wrong.",
    "Saving this for the next planning round.",
    "This matches what we measured, almost to the millisecond.",
    "Counterpoint: that only holds while the write volume stays flat.",
    "Underrated point, especially the second half.",
    "We put this in our review checklist after a very similar incident.",
    "Adding this to the onboarding doc, thank you.",
]

REPLIES = [
    "Happy to write it up properly - there is more detail than fits here.",
    "Fair, and the volume assumption is doing a lot of work in my example.",
    "That is the part that took us longest to accept, too.",
    "Good catch, I will amend the doc.",
]


def backdate(model, pk, when, field="created_at"):
    """Overwrite an auto_now_add timestamp so the demo data has a realistic age."""
    model.objects.filter(pk=pk).update(**{field: when})


def backdate_content(model, pk, when):
    """Age a Post or Comment.

    ``updated_at`` has to move with ``created_at``: the API derives its
    ``is_edited`` flag from the gap between the two, so touching only
    ``created_at`` would label every seeded post "edited".
    """
    model.objects.filter(pk=pk).update(created_at=when, updated_at=when)


@transaction.atomic
def main():
    # --- clean slate (this database is only ever the portfolio demo) --------
    Notification.objects.all().delete()
    Bookmark.objects.all().delete()
    PostLike.objects.all().delete()
    Comment.objects.all().delete()
    Post.objects.all().delete()
    Hashtag.objects.all().delete()
    Follow.objects.all().delete()
    User.objects.all().delete()

    users: dict[str, object] = {}
    for index, (username, first, last, headline, location, bio, site, joined) in enumerate(PEOPLE):
        user = User.objects.create_user(
            username=username,
            email=f"{username}@demo.invalid",
            password=DEMO_PASSWORD,
            first_name=first,
            last_name=last,
            headline=headline,
            location=location,
            bio=bio,
            website=site,
        )
        palette = PALETTES[index % len(PALETTES)]
        if username != NEWCOMER:
            user.avatar.save(
                f"{username}.webp",
                content_file(avatar_image(f"{first[0]}{last[0]}".upper(), palette), "a.webp"),
                save=True,
            )
        if username in WITH_COVER:
            user.cover.save(
                f"{username}-cover.webp",
                content_file(abstract_image((1600, 600), palette), "c.webp"),
                save=True,
            )
        # After the image saves, never before: `FileField.save(save=True)`
        # writes the whole in-memory row back and would restore today's
        # date_joined, making every profile read "Joined <today>".
        backdate(User, user.pk, NOW - timedelta(days=joined), field="date_joined")
        user.refresh_from_db()
        users[username] = user
    print(f"users: {len(users)}")

    active = [name for name in users if name != NEWCOMER]

    # --- follow graph ------------------------------------------------------
    # Everyone follows 4-6 of the others. The hero deliberately does NOT follow
    # two people, so "Who to follow" always has something to suggest.
    hero_skips = {"felix.nakamura", "luca.marchetti"}
    follows = 0
    for username in active:
        others = [name for name in active if name != username]
        if username == HERO:
            targets = [name for name in others if name not in hero_skips]
        else:
            targets = RNG.sample(others, k=RNG.randint(5, 7))
            # Most of the cast follows the hero back, so the profile the
            # screenshots are taken from does not read as abandoned.
            if HERO not in targets and username not in {"luca.marchetti"}:
                targets.append(HERO)
        for target in targets:
            follow, created = Follow.objects.get_or_create(
                follower=users[username], following=users[target]
            )
            if created:
                follows += 1
                # Spread follows across the pair's shared history instead of
                # stamping all 48 of them with the moment the script ran.
                youngest = min(
                    (NOW - users[username].date_joined).days,
                    (NOW - users[target].date_joined).days,
                )
                age_days = RNG.uniform(0.5, max(1.0, youngest * 0.9))
                backdate(Follow, follow.pk, NOW - timedelta(days=age_days))
    print(f"follows: {follows}")

    # --- posts -------------------------------------------------------------
    posts = []
    for index, (username, content, has_image, hours) in enumerate(POSTS):
        post = Post.objects.create(author=users[username], content=content)
        sync_hashtags(post)
        notify_mentions(users[username], content, post)
        # A mention notification must be as old as the post that mentions you.
        Notification.objects.filter(post=post, verb=Verb.MENTION).update(
            created_at=NOW - timedelta(hours=hours)
        )
        if has_image:
            post.image.save(
                f"post-{index}.webp",
                content_file(
                    abstract_image((1200, 800), PALETTES[(index * 3) % len(PALETTES)]), "p.webp"
                ),
                save=True,
            )
        backdate_content(Post, post.pk, NOW - timedelta(hours=hours))
        post.refresh_from_db()
        posts.append(post)
    print(f"posts: {len(posts)}")

    # --- quotes ------------------------------------------------------------
    quotes = []
    for username, target, content, hours in QUOTES:
        quote = Post.objects.create(
            author=users[username], content=content, repost_of=posts[target]
        )
        sync_hashtags(quote)
        original = posts[target]
        if original.author_id != quote.author_id:
            note = Notification.objects.create(
                recipient=original.author, actor=users[username], verb=Verb.QUOTE, post=quote
            )
            backdate(Notification, note.pk, NOW - timedelta(hours=hours))
        backdate_content(Post, quote.pk, NOW - timedelta(hours=hours))
        quotes.append(quote)
    print(f"quotes: {len(quotes)}")

    # --- plain reposts -----------------------------------------------------
    reposts = 0
    for username, target, hours in REPOSTS:
        original = posts[target]
        if original.author_id == users[username].pk:
            continue
        repost = Post.objects.create(author=users[username], repost_of=original, content="")
        backdate_content(Post, repost.pk, NOW - timedelta(hours=hours))
        note = Notification.objects.create(
            recipient=original.author, actor=users[username], verb=Verb.REPOST, post=original
        )
        backdate(Notification, note.pk, NOW - timedelta(hours=hours))
        reposts += 1
    print(f"reposts: {reposts}")

    # --- likes, comments, replies, bookmarks -------------------------------
    likes = comments = replies = bookmarks = 0
    for post in posts:
        post_age = (NOW - post.created_at).total_seconds() / 3600
        for fan in RNG.sample(active, k=RNG.randint(3, 7)):
            if users[fan].pk == post.author_id:
                continue
            like, created = PostLike.objects.get_or_create(user=users[fan], post=post)
            if not created:
                continue
            likes += 1
            offset = timedelta(hours=max(0.2, post_age - RNG.uniform(0.2, max(0.4, post_age / 2))))
            backdate(PostLike, like.pk, NOW - offset)
            note = Notification.objects.create(
                recipient=post.author, actor=users[fan], verb=Verb.LIKE_POST, post=post
            )
            backdate(Notification, note.pk, NOW - offset)

        # Draw the wording without replacement: two people leaving the exact
        # same sentence under one post reads as a rendering bug, not a thread.
        commenters = RNG.sample(active, k=RNG.randint(1, 3))
        wording = iter(RNG.sample(COMMENTS, k=len(commenters)))
        replies_for_post = iter(RNG.sample(REPLIES, k=min(len(commenters), len(REPLIES))))
        for commenter in commenters:
            text = next(wording)
            if users[commenter].pk == post.author_id:
                continue
            offset = timedelta(hours=max(0.1, post_age - RNG.uniform(0.1, max(0.3, post_age / 2))))
            comment = Comment.objects.create(post=post, author=users[commenter], content=text)
            backdate_content(Comment, comment.pk, NOW - offset)
            comments += 1
            note = Notification.objects.create(
                recipient=post.author,
                actor=users[commenter],
                verb=Verb.COMMENT,
                post=post,
                comment=comment,
            )
            backdate(Notification, note.pk, NOW - offset)

            if RNG.random() > 0.45:
                reply_offset = offset - timedelta(minutes=RNG.randint(5, 50))
                if reply_offset.total_seconds() <= 0:
                    reply_offset = timedelta(minutes=2)
                reply = Comment.objects.create(
                    post=post,
                    author=post.author,
                    parent=comment,
                    content=next(replies_for_post, REPLIES[0]),
                )
                backdate_content(Comment, reply.pk, NOW - reply_offset)
                replies += 1
                note = Notification.objects.create(
                    recipient=comment.author,
                    actor=post.author,
                    verb=Verb.REPLY,
                    post=post,
                    comment=reply,
                )
                backdate(Notification, note.pk, NOW - reply_offset)
            # A few comment likes, so the comment like button is not always 0.
            for liker in RNG.sample(active, k=RNG.randint(0, 2)):
                if users[liker].pk != comment.author_id:
                    comment.likes.add(users[liker])

    # The hero saves a handful of posts so Bookmarks is not an empty screen.
    for target in (1, 4, 5, 8, 14, 20, 22):
        _, created = Bookmark.objects.get_or_create(user=users[HERO], post=posts[target])
        if created:
            bookmarks += 1
    for other in ("tobi.okonkwo", "june.calloway"):
        for target in RNG.sample(range(len(posts)), k=3):
            Bookmark.objects.get_or_create(user=users[other], post=posts[target])
    print(f"likes: {likes}, comments: {comments}, replies: {replies}, bookmarks: {bookmarks}")

    # --- follow notifications ---------------------------------------------
    for follow in Follow.objects.all():
        note, created = Notification.objects.get_or_create(
            recipient=follow.following, actor=follow.follower, verb=Verb.FOLLOW
        )
        if created:
            backdate(Notification, note.pk, follow.created_at)

    # --- make sure the hero's notification list shows every verb ----------
    # LIKE_COMMENT and MENTION are the two that random seeded traffic may not
    # produce for this specific account, so they are created explicitly.
    hero = users[HERO]
    hero_comment = Comment.objects.filter(author=hero, parent__isnull=True).first()
    if hero_comment is None:
        hero_comment = Comment.objects.create(
            post=posts[2], author=hero, content=RNG.choice(COMMENTS)
        )
        backdate_content(Comment, hero_comment.pk, NOW - timedelta(hours=6))
    note = Notification.objects.create(
        recipient=hero,
        actor=users["zoe.aberdeen"],
        verb=Verb.LIKE_COMMENT,
        post=hero_comment.post,
        comment=hero_comment,
    )
    backdate(Notification, note.pk, NOW - timedelta(minutes=35))
    hero_comment.likes.add(users["zoe.aberdeen"])

    if not Notification.objects.filter(recipient=hero, verb=Verb.MENTION).exists():
        mention_post = Post.objects.create(
            author=users["june.calloway"],
            content="Pairing with @mira.kessel on the queue rewrite next sprint - if you want "
            "to see how backpressure works in practice, join the review. #engineering",
        )
        sync_hashtags(mention_post)
        notify_mentions(users["june.calloway"], mention_post.content, mention_post)
        backdate_content(Post, mention_post.pk, NOW - timedelta(hours=1))
        Notification.objects.filter(recipient=hero, verb=Verb.MENTION).update(
            created_at=NOW - timedelta(hours=1)
        )

    # --- curate the hero's notification list -------------------------------
    # The screen renders a different icon, colour and sentence per verb, so the
    # first page must contain all eight. For each verb the hero's most recent
    # notification is moved into the last day and left unread; everything older
    # is marked read. Nothing is invented here - only the timestamps of
    # already-seeded activity are arranged so one screenshot shows every case.
    Notification.objects.all().update(is_read=True)
    showcase = []
    for offset_minutes, verb in enumerate(
        [
            Verb.MENTION,
            Verb.QUOTE,
            Verb.REPOST,
            Verb.LIKE_COMMENT,
            Verb.REPLY,
            Verb.COMMENT,
            Verb.LIKE_POST,
            Verb.FOLLOW,
        ]
    ):
        note = (
            Notification.objects.filter(recipient=hero, verb=verb)
            .order_by("-created_at", "-id")
            .first()
        )
        if note is None:
            print(f"  WARNING: no {verb} notification for {HERO}")
            continue
        backdate(Notification, note.pk, NOW - timedelta(minutes=18 + offset_minutes * 97))
        showcase.append(note.pk)
    Notification.objects.filter(pk__in=showcase).update(is_read=False)
    print(f"hero notification verbs on page 1: {len(showcase)}/8")

    # The brand-new account must stay completely empty.
    Notification.objects.filter(recipient=users[NEWCOMER]).delete()
    Follow.objects.filter(follower=users[NEWCOMER]).delete()
    Follow.objects.filter(following=users[NEWCOMER]).delete()
    Bookmark.objects.filter(user=users[NEWCOMER]).delete()

    print(
        "totals - users: {u}, posts: {p} (incl. {q} quotes / {r} reposts), comments: {c}, "
        "likes: {lk}, bookmarks: {b}, hashtags: {h}, notifications: {n} "
        "(unread for {hero}: {unread})".format(
            u=User.objects.count(),
            p=Post.objects.count(),
            q=len(quotes),
            r=reposts,
            c=Comment.objects.count(),
            lk=PostLike.objects.count(),
            b=Bookmark.objects.count(),
            h=Hashtag.objects.count(),
            n=Notification.objects.count(),
            hero=HERO,
            unread=Notification.objects.filter(recipient=hero, is_read=False).count(),
        )
    )
    print(f"password for every demo account: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
