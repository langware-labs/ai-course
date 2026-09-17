/* The bakery — ONE server, for every step that talks to one.
 *
 * The lab (step 7) lets the student build requests by hand; the module (step 8)
 * has them write the fetch code. Both aim at https://bakery.flowpad.test, so
 * both must get the same answers: when the menu is in Hebrew on one screen and
 * English on the next, or an order is `{item, qty}` here and `{item_id,
 * quantity}` there, the student is right to think they broke something.
 *
 * It answers like a real server — a status, headers and a JSON body — and its
 * errors say what to fix. Nothing here touches the network.
 *
 * Exposed as `window.__bakery = { HOST, MENU, handle(request) }`.
 *   handle({ method, url | path, query?, body? }) -> { status, headers, body }
 * `body` goes in as JSON text or an object, and comes back as DATA: each caller
 * renders it its own way.
 */
(function () {
  'use strict';

  const HOST = 'https://bakery.flowpad.test';

  const MENU = [
    { id: 1, name: 'Sourdough', type: 'bread', price: 18 },
    { id: 2, name: 'Baguette', type: 'bread', price: 9 },
    { id: 3, name: 'Croissant', type: 'pastry', price: 7 },
    { id: 4, name: 'Cinnamon roll', type: 'pastry', price: 8 }
  ];

  // One order is already baking, so a first GET /orders shows something real.
  let orders = [{ order_id: 'BK-7K2QM', item: 'Sourdough', quantity: 2, total: 36, status: 'baking' }];

  function newOrderId() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let n = 0; n < 5; n++) id += abc[Math.floor(Math.random() * abc.length)];
    return 'BK-' + id;
  }

  const json = (status, body, extra) => ({
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extra || {}),
    body
  });

  /** Accept either a full URL (the module's fetch shim) or a path + query (the lab). */
  function target(req) {
    if (req.path !== undefined) {
      return { path: (req.path || '/').replace(/\/+$/, '') || '/', query: req.query || {}, ok: true };
    }
    let url;
    try { url = new URL(req.url, HOST); } catch (e) { return { ok: false, reason: 'That is not a valid URL' }; }
    if (url.origin !== HOST) return { ok: false, reason: 'This lesson only reaches ' + HOST };
    const query = {};
    url.searchParams.forEach((v, k) => { query[k] = v; });
    return { path: url.pathname.replace(/\/+$/, '') || '/', query, ok: true };
  }

  function parseBody(body) {
    if (body === undefined || body === null || body === '') return { value: null };
    if (typeof body === 'object') return { value: body };
    try { return { value: JSON.parse(body) }; } catch (e) {
      return { error: 'The request body must be JSON. Did you JSON.stringify it?' };
    }
  }

  function handle(req) {
    const where = target(req);
    if (!where.ok) return json(400, { error: where.reason });
    const method = (req.method || 'GET').toUpperCase();
    const parts = where.path.split('/').filter(Boolean);
    const parsed = parseBody(req.body);
    if (parsed.error) return json(400, { error: parsed.error });
    const body = parsed.value;

    if (parts[0] === 'menu' && parts.length === 1) {
      if (method !== 'GET') return json(405, { error: 'Use GET to read the menu' }, { Allow: 'GET' });
      const type = where.query.type;
      return json(200, type ? MENU.filter(i => i.type === type) : MENU, { 'Cache-Control': 'max-age=60' });
    }
    if (parts[0] === 'menu' && parts.length === 2) {
      if (method !== 'GET') return json(405, { error: 'Use GET to read a menu item' }, { Allow: 'GET' });
      const item = MENU.find(i => String(i.id) === parts[1]);
      return item ? json(200, item) : json(404, { error: 'No menu item with id ' + parts[1] });
    }

    if (parts[0] === 'orders' && parts.length === 1) {
      if (method === 'GET') return json(200, orders);
      if (method !== 'POST') return json(405, { error: 'Create an order with POST' }, { Allow: 'GET, POST' });
      const item = MENU.find(i => i.id === Number(body && body.item_id));
      const quantity = Number(body && body.quantity);
      if (!item) return json(400, { error: 'item_id must be the id of a menu item', field: 'item_id' });
      if (!Number.isInteger(quantity) || quantity < 1) {
        return json(400, { error: 'quantity must be a whole number, 1 or more', field: 'quantity' });
      }
      const order = { order_id: newOrderId(), item: item.name, quantity, total: item.price * quantity, status: 'baking' };
      orders.push(order);
      return json(201, order, { Location: '/orders/' + order.order_id });
    }
    if (parts[0] === 'orders' && parts.length === 2) {
      const order = orders.find(o => o.order_id === parts[1]);
      if (!order) return json(404, { error: 'No order ' + parts[1] });
      if (method === 'GET') return json(200, order);
      if (method === 'PUT') {
        const quantity = Number(body && body.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
          return json(400, { error: 'quantity must be a whole number, 1 or more', field: 'quantity' });
        }
        const price = (MENU.find(i => i.name === order.item) || {}).price || 0;
        order.quantity = quantity;
        order.total = price * quantity;
        return json(200, order);
      }
      if (method === 'DELETE') {
        orders = orders.filter(o => o.order_id !== parts[1]);
        return { status: 204, headers: {}, body: null };
      }
      return json(405, { error: 'Read an order with GET' }, { Allow: 'GET, PUT, DELETE' });
    }
    return json(404, { error: 'Nothing at ' + where.path });
  }

  window.__bakery = { HOST, MENU, handle };
})();
