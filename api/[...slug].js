module.exports = async function handler(req, res) {
  if (!process.env.AIRTABLE_API_KEY) {
    return res.status(500).json({ error: "proxy_error", message: "AIRTABLE_API_KEY is not set in environment variables." });
  }
  const slug = req.query.slug;
  const path = Array.isArray(slug) ? slug.join("/") : (slug || "");
  const airtableUrl = new URL(`https://api.airtable.com/${path}`);
  const { slug: _slug, ...rest } = req.query;
  for (const [key, value] of Object.entries(rest)) {
    if (Array.isArray(value)) value.forEach(v => airtableUrl.searchParams.append(key, v));
    else airtableUrl.searchParams.append(key, value);
  }
  const options = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    options.body = JSON.stringify(req.body);
  }
  try {
    const upstream = await fetch(airtableUrl.toString(), options);
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await upstream.text();
      return res.status(upstream.status).json({
        error: "airtable_non_json",
        message: `Airtable returned HTTP ${upstream.status} with non-JSON content. Check your API key and token scopes.`,
        preview: text.slice(0, 300),
      });
    }
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "proxy_error", message: err.message });
  }
}
