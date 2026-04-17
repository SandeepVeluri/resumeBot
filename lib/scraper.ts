import * as cheerio from 'cheerio';

export type LinkType = 'github' | 'medium' | 'figma' | 'website' | 'other';

export function detectLinkType(url: string): LinkType {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('github.com')) return 'github';
    if (host.includes('medium.com')) return 'medium';
    if (host.includes('figma.com')) return 'figma';
    return 'website';
  } catch {
    return 'other';
  }
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ResumeChatBot/1.0; +https://resumechat.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeGithub(url: string): Promise<string> {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const username = parts[0];
    if (!username) return scrapeGeneric(url);

    // Fetch profile page for bio + pinned repos.
    const html = await fetchText(`https://github.com/${username}`);
    const $ = cheerio.load(html);
    const bio = $('div.user-profile-bio').text().trim();
    const pinned: string[] = [];
    $('ol.pinned-list li, .js-pinned-items-reorder-list li').each((_, el) => {
      const name = $(el).find('a span.repo').text().trim();
      const description = $(el).find('p').first().text().trim();
      if (name) pinned.push(`${name}: ${description}`);
    });

    // Also pull the API for languages / repos if available.
    let apiData = '';
    try {
      const apiRes = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=10&sort=updated`,
        {
          headers: { Accept: 'application/vnd.github+json' },
        },
      );
      if (apiRes.ok) {
        const repos = (await apiRes.json()) as Array<{
          name: string;
          description: string | null;
          language: string | null;
          stargazers_count: number;
        }>;
        apiData = repos
          .slice(0, 6)
          .map(
            (r) =>
              `${r.name} (${r.language ?? 'unknown'}, ★${r.stargazers_count})${
                r.description ? ': ' + r.description : ''
              }`,
          )
          .join('\n');
      }
    } catch {
      /* ignore */
    }

    return [
      bio && `Bio: ${bio}`,
      pinned.length > 0 && `Pinned repos:\n${pinned.join('\n')}`,
      apiData && `Recent repos:\n${apiData}`,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 2000) || scrapeGeneric(url);
  } catch {
    return scrapeGeneric(url);
  }
}

async function scrapeMedium(url: string): Promise<string> {
  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const name = $('meta[property="og:title"]').attr('content') ?? '';
    const articles: string[] = [];
    $('article').each((_, el) => {
      const title = $(el).find('h2, h3').first().text().trim();
      const sub = $(el).find('h4, p').first().text().trim();
      if (title) articles.push(`${title}${sub ? ' — ' + sub : ''}`);
    });
    return [
      name && `Profile: ${name}`,
      articles.length > 0 && `Articles:\n${articles.slice(0, 10).join('\n')}`,
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 2000);
  } catch {
    return scrapeGeneric(url);
  }
}

async function scrapeFigma(url: string): Promise<string> {
  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const title = $('meta[property="og:title"]').attr('content') ?? '';
    const description = $('meta[property="og:description"]').attr('content') ?? '';
    return `Figma: ${title}\n${description}`.slice(0, 2000);
  } catch {
    return scrapeGeneric(url);
  }
}

async function scrapeGeneric(url: string): Promise<string> {
  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim();
    const description =
      $('meta[name="description"]').attr('content') ??
      $('meta[property="og:description"]').attr('content') ??
      '';
    $('script, style, noscript').remove();
    const body = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 500);
    return [
      title && `Title: ${title}`,
      description && `Description: ${description}`,
      body && `Preview: ${body}`,
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 2000);
  } catch (err) {
    return `Could not fetch content: ${err instanceof Error ? err.message : 'unknown error'}`;
  }
}

export async function scrapeUrl(url: string): Promise<{
  type: LinkType;
  content: string;
}> {
  const type = detectLinkType(url);
  let content: string;
  switch (type) {
    case 'github':
      content = await scrapeGithub(url);
      break;
    case 'medium':
      content = await scrapeMedium(url);
      break;
    case 'figma':
      content = await scrapeFigma(url);
      break;
    default:
      content = await scrapeGeneric(url);
  }
  return { type, content };
}
