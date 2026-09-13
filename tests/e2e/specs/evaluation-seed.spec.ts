import { expect, test } from '../fixtures';

test.describe('Evaluation Seed & Isolation Feature', () => {
  // AC: Given test environment, when seed is requested, then records are stored sequentially
  test('happy path: test fixture seeds data and teardown cleans cleanly', async ({ request }) => {
    const res = await request.post('/api/test/seed', {
      data: [{ name: 'pair-assignment-1' }, { name: 'pair-assignment-2' }],
    });
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json.count).toBe(2);
    expect(json.items).toHaveLength(2);
    expect(json.items[0].id).toBe('1');
    expect(json.items[1].id).toBe('2');
  });

  // AC: Given invalid body, when seed is posted, then system rejects with bad request 400
  test('edge case: invalid seed body is rejected', async ({ request }) => {
    const res = await request.post('/api/test/seed', {
      data: 'invalid string payload',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });
});