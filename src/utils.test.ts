import { assertEquals } from '../dev_deps.ts';

import { hrTimeToMilliseconds, millisToHrTime } from './utils.ts';

Deno.test('millisToHrTime', async (t) => {
    assertEquals(millisToHrTime(200), [0, 200000000]);
});

Deno.test('hrTimeToMilliseconds', async (t) => {
    assertEquals(hrTimeToMilliseconds(millisToHrTime(200)), 200);
});
