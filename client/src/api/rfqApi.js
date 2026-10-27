async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`/api${path}`, options);
  } catch (err) {
    if (options.signal?.aborted) {
      throw err;
    }

    throw new Error('Cannot reach the server. Please try again.', { cause: err });
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const message = response.status >= 500
      ? 'The server is unavailable. Please try again.'
      : data?.message || 'The request could not be completed. Please try again.';
    const err = new Error(message);
    err.status = response.status;
    err.errors = data?.errors || {};
    throw err;
  }

  return data;
}

export function getRfqs(signal) {
  return request('/rfqs', { signal });
}

export function getRfq(id, signal) {
  return request(`/rfqs/${encodeURIComponent(id)}`, { signal });
}

export function createRfq(data, signal) {
  return request('/rfqs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });
}

export function getSuppliers(signal) {
  return request('/suppliers', { signal });
}

export function getBids(id, signal) {
  return request(`/rfqs/${encodeURIComponent(id)}/bids`, { signal });
}

export function getActivities(id, signal) {
  return request(`/rfqs/${encodeURIComponent(id)}/activities`, { signal });
}

export function submitBid(id, data, signal) {
  return request(`/rfqs/${encodeURIComponent(id)}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });
}
