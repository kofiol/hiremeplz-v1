import { Actor } from 'apify';
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import inputJson from './input.json'; // <- For local testing on Windows

interface Input {
    urls: string[];
}

interface ProfileData {
    url: string;
    name?: string;
    title?: string;
    location?: string;
    hourlyRate?: string;
    skills: string[];
}

(async () => {
    await Actor.init();

    // ===== LOCAL TESTING: use imported JSON =====
    const input: Input = inputJson;

    // ===== APIFY DEPLOYMENT: uncomment the line below and comment out above line =====
    // const input: Input = await Actor.getInput();

    if (!input.urls || input.urls.length === 0) {
        console.log('No URLs provided. Exiting.');
        await Actor.exit();
        return;
    }

    console.log('Scraping URLs:', input.urls);

    const results: ProfileData[] = [];

    // Use Apify Proxy
    const proxyConfig: ProxyConfiguration = await Actor.createProxyConfiguration({
        useApifyProxy: true,
    })!;

    const crawler = new PlaywrightCrawler({
        proxyConfiguration: proxyConfig,
        launchContext: { launchOptions: { headless: true } },
        requestHandler: async ({ page, request, log }) => {
            const url = request.url;
            log.info(`Scraping: ${url}`);

            await page.waitForLoadState('networkidle');

            // Extract profile details
            const name = await page.textContent('h1[data-testid="freelancer-name"]');
            const title = await page.textContent('h2[data-testid="freelancer-title"]');
            const location = await page.textContent('div[data-testid="freelancer-location"]');
            const hourlyRate = await page.textContent('div[data-testid="freelancer-hourly-rate"]');

            const skills = await page.$$eval('a[data-testid="freelancer-skill"]', nodes =>
                nodes.map(el => el.textContent?.trim() || '')
            );

            results.push({
                url,
                name: name?.trim(),
                title: title?.trim(),
                location: location?.trim(),
                hourlyRate: hourlyRate?.trim(),
                skills,
            });
        },
    });

    await crawler.run(input.urls);

    await Actor.pushData(results);
    console.log('Scraping finished. Results pushed to dataset.');
    await Actor.exit();
})();
