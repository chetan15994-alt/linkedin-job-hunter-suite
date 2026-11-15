/**
 * Browser DOM manipulation routines for expanding and scanning LinkedIn posts
 * across Saved Posts, Feed / For You, and Search Results.
 */

async function expand(page) {
  return page.evaluate(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const normalize = value => (value || '').replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim();
    
    const isExpandButton = el => {
      if (!el) return false;
      // Absolutely never touch links or anything inside links
      if (el.tagName === 'A' || el.closest('a') || el.hasAttribute('href')) return false;

      const tag = el.tagName;
      const role = el.getAttribute('role');
      if (tag !== 'BUTTON' && role !== 'button') return false;

      const txt = normalize(el.innerText || '');
      const aria = normalize(el.getAttribute('aria-label') || '');

      const exactOrEllipsis = /^(?:\.{3})?\s*(?:see\s+more|show\s+more|more)$/i;
      const endsWithEllipsisMore = /(?:\.{3})\s*more$/i;

      return (
        exactOrEllipsis.test(txt) ||
        endsWithEllipsisMore.test(txt) ||
        exactOrEllipsis.test(aria) ||
        endsWithEllipsisMore.test(aria) ||
        el.classList.contains('feed-shared-inline-show-more-text__see-more-less-toggle') ||
        el.classList.contains('k4dl29')
      );
    };

    const root = document.getElementById('workspace') || document.querySelector('main') || document.body;
    const candidates = root.querySelectorAll('button, [role="button"]');
    const toClick = [];

    for (const btn of candidates) {
      if (isExpandButton(btn)) {
        if (btn.offsetParent !== null) { // visible
          toClick.push(btn);
        }
      }
    }

    let clicked = 0;
    for (const btn of toClick) {
      try {
        btn.click();
        clicked++;
        await wait(25);
      } catch (err) {
        // Element may have detached after parent DOM update
      }
    }
    return clicked;
  });
}

async function scan(page) {
  return page.evaluate(() => {
    const agePattern = /(?:^|\n|\s)(\d+(?:\.\d+)?)\s*(min|m|h|d|w|mo|mos|yr|yrs|y)(?=\s*(?:[·•]|\n|$))/ig;
    const toDays = (value, unit) => {
      const u = unit.toLowerCase();
      return u === 'm' || u === 'min' ? value / 1440 :
             u === 'h' ? value / 24 :
             u === 'd' ? value :
             u === 'w' ? value * 7 :
             u === 'mo' || u === 'mos' ? value * 30.4375 :
             value * 365.25;
    };

    const main = document.querySelector('main') || document.body;
    if (!main) return [];

    const posts = [];
    const seen = new Set();

    function addCard(author, card, url) {
      if (!card) return;
      const text = (card.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
      if (text.length < 35) return;

      const key = text.slice(0, 250);
      if (seen.has(key)) return;
      seen.add(key);

      agePattern.lastIndex = 0;
      const match = agePattern.exec(text);
      let age = 'Recent';
      let days = 0;
      if (match) {
        age = match[1] + match[2];
        days = toDays(Number(match[1]), match[2]);
      }

      const postUrl = url || card.querySelector('a[href*="/feed/update/"], a[href*="/posts/"], a[href*="activity:"]')?.href || '';
      const top = card.getBoundingClientRect().top + window.scrollY;

      posts.push({
        author: author || 'Unknown Author',
        age,
        days,
        text,
        url: postUrl,
        top
      });
    }

    // Strategy 1: Control buttons on modern LinkedIn Feed and Search updates
    const controlButtons = [...main.querySelectorAll('button')].filter(b => {
      const aria = b.getAttribute('aria-label') || '';
      return aria.includes('control menu for post by') || aria.includes('Hide post by');
    });

    for (const btn of controlButtons) {
      const aria = btn.getAttribute('aria-label') || '';
      const authorMatch = aria.match(/(?:control menu for post by|Hide post by)\s+(.*)/i);
      const author = authorMatch ? authorMatch[1].trim() : '';

      let cur = btn.parentElement;
      let card = null;
      while (cur && cur.tagName !== 'MAIN' && cur.tagName !== 'BODY') {
        if (cur.querySelector('button[aria-label*="Reaction" i], button[aria-label*="Comment" i], button[aria-label*="Repost" i]')) {
          card = cur;
          break;
        }
        cur = cur.parentElement;
      }
      if (card) {
        addCard(author, card);
      }
    }

    // Strategy 2: List items (for Saved Posts and classic lists)
    const listItems = [...main.querySelectorAll('li')].filter(li => {
      return li.innerText && li.innerText.length > 50 && !li.querySelector('ul, ol');
    });

    for (const li of listItems) {
      const lines = li.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      const author = lines[0] === 'Status is reachable' && lines[1] ? lines[1] : (lines[0] || 'Unknown Author');
      addCard(author, li);
    }

    // Strategy 3: Classic semantic cards and search result containers
    const classicCards = [...main.querySelectorAll('article, [data-urn], .feed-shared-update-v2, .reusable-search__result-container')];
    for (const card of classicCards) {
      const lines = card.innerText.split('\n').map(l => l.trim()).filter(Boolean);
      const author = lines[0] === 'Status is reachable' && lines[1] ? lines[1] : (lines[0] || 'Unknown Author');
      addCard(author, card);
    }

    return posts.sort((a, b) => a.top - b.top);
  });
}

module.exports = { expand, scan };
