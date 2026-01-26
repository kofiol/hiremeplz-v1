
const BASE_URL = "http://localhost:3000/api/v1";

// Default token for convenience (from previous successful curl)
const DEFAULT_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImQyMzhlMTE4LTkzMjYtNDdmYi04N2U0LThiOTQxODdkMGQ4YiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3BldXJid2NyaWxvYm1qbHBia3JwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkN2Q5MTI3My03NmQ4LTQyZjItYWU1ZS0wZWIzZjQ5NjJmMzMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY2NzYxNjU4LCJpYXQiOjE3NjY3NTgwNTgsImVtYWlsIjoicHN5aGlrMTdAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InBzeWhpazE3QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImQ3ZDkxMjczLTc2ZDgtNDJmMi1hZTVlLTBlYjNmNDk2MmYzMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc2Njc1ODA1OH1dLCJzZXNzaW9uX2lkIjoiOWViZTA3Y2YtMmU4Ny00NGIyLWJhM2ItZGIwN2RmYjZjMDhjIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.Yf0Om0f-93wDO69Afy1mtZpciM3dgVXOY8g9F89yWCxhTl44lASxnyiHe1xlBUx1y_a9UlTq58vuyOH36GE18g";

const TOKEN = process.argv[2] || DEFAULT_TOKEN;

if (!TOKEN) {
  console.error("❌ Error: No token provided.");
  console.error("Usage: node apps/web/scripts/test-api.mjs <YOUR_ACCESS_TOKEN>");
  process.exit(1);
}


console.log(`Using Token: ${TOKEN.slice(0, 10)}...${TOKEN.slice(-10)}`);

async function testEndpoint(name, path) {
  console.log(`\nTesting ${name} (${path})...`);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    const status = res.status;
    const data = await res.json();

    if (res.ok) {
      console.log(`✅ Success (${status}):`);
      console.dir(data, { depth: null, colors: true });
    } else {
      console.error(`❌ Failed (${status}):`);
      console.error(data);
    }
  } catch (err) {
    console.error(`❌ Error connecting to ${path}:`, err.message);
  }
}

async function run() {
  console.log("🚀 Starting API Tests...");
  console.log(`Target: ${BASE_URL}`);

  await testEndpoint("Health Check", "/health");
  await testEndpoint("Current User", "/me");
  await testEndpoint("Team Details", "/teams");
  
  console.log("\nDone.");
}

run();
