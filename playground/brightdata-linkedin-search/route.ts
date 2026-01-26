
const DATASET_ID = "gd_lpfll7v5hcqtkxl6l";
const API_TOKEN = "ad0360fc9b58de114227b5934f4a537dd8c7c6d61d98d5a4e2401b7d203e2074";

async function main() {
  console.log("Triggering dataset...");
  const triggerResponse = await fetch(
    `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}&include_errors=true&type=discover_new&discover_by=keyword`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [
          {
            location: "Texas",
            keyword: "Next.js React Tailwind CSS developer ",
            country: "US",
            time_range: "Past week",
            selective_search: false,
          },
        ],
      }),
    }
  );

  if (!triggerResponse.ok) {
    console.error("Failed to trigger:", await triggerResponse.text());
    return;
  }

  const { snapshot_id } = (await triggerResponse.json()) as { snapshot_id: string };

  const startTime = Date.now();
  console.log(`Snapshot triggered: ${snapshot_id}`);
  console.log("Scraping started... This may take a few minutes depending on the volume of data.");

  // Poll for results
  while (true) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(`\rPolling for results... (Elapsed: ${elapsed}s)`);
    await new Promise((r) => setTimeout(r, 5000)); // Wait 5s

    const snapshotResponse = await fetch(
      `https://api.brightdata.com/datasets/v3/snapshot/${snapshot_id}?format=json`,
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      }
    );

    if (snapshotResponse.status === 202) {
      continue;
    }

    process.stdout.write("\n"); // New line after polling is done

    if (snapshotResponse.ok) {
      const data = await snapshotResponse.json();
      console.log("Data received:", JSON.stringify(data, null, 2));
      break;
    }

    console.error(
      "Error fetching snapshot:",
      snapshotResponse.status,
      await snapshotResponse.text()
    );
    break;
  }
}

main().catch(console.error);
