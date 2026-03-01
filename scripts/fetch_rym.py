#!/usr/bin/env python3
import re
import json
import sys
import argparse
import ssl
from urllib.request import urlopen, Request
from xml.etree import ElementTree as ET

FEED_URL = 'https://rateyourmusic.com/~lachlanelijah/data/rss'

# Common browser-like headers to avoid simple bot blocks
DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://rateyourmusic.com/',
}


def parse_item(item):
    title = item.findtext('title') or ''
    link = item.findtext('link') or item.findtext('guid') or ''
    pubDate = item.findtext('pubDate') or ''
    # title format: "Rated Twilight Zone by Multiple Artists 3.0 stars"
    m = re.search(r'Rated\s+(.+?)\s+by\s+(.+?)\s+(\d+(?:\.\d)?)\s*stars', title)
    if m:
        album = m.group(1).strip()
        artist = m.group(2).strip()
        rating = m.group(3).strip()
    else:
        album = title
        artist = ''
        rating = ''
    return {
        'title': title,
        'album': album,
        'artist': artist,
        'rating': rating,
        'link': link,
        'pubDate': pubDate,
    }


def fetch_and_write(path='rym.json', limit=10, insecure=False):
    # Try a few times with browser-like headers in case the site blocks simple agents
    last_err = None
    ctx = None
    if insecure:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    for attempt in range(3):
        try:
            req = Request(FEED_URL, headers=DEFAULT_HEADERS)
            if ctx is not None:
                with urlopen(req, timeout=30, context=ctx) as resp:
                    data = resp.read()
            else:
                with urlopen(req, timeout=30) as resp:
                    data = resp.read()
            break
        except Exception as e:
            last_err = e
            # tweak headers on retry: sometimes adding an X-Requested-With or changing Referer helps
            DEFAULT_HEADERS['X-Requested-With'] = 'XMLHttpRequest'
    else:
        raise last_err
    root = ET.fromstring(data)
    items = root.findall('.//item')
    parsed = [parse_item(it) for it in items[:limit]]
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('--out', '-o', default='rym.json')
    p.add_argument('--limit', '-n', type=int, default=20)
    p.add_argument('--insecure', action='store_true', help='Disable SSL verification (local testing only)')
    args = p.parse_args(argv)
    try:
        fetch_and_write(args.out, limit=args.limit, insecure=args.insecure)
        print('Wrote', args.out)
    except Exception as e:
        print('Error fetching feed:', e, file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
