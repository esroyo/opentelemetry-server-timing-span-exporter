import {
    ExportResult,
    ExportResultCode,
    hrTime,
    millisToHrTime,
} from '../deps.ts';
import { assertEquals, spy } from '../dev_deps.ts';
import { PartialReadableSpan, PartialTimedEvent, TraceId } from './types.ts';

import { ServerTimingSpanExporter } from './server-timing-span-exporter.ts';

type ReadableSpanOptions = {
    name: PartialReadableSpan['name'];
    duration: PartialReadableSpan['duration'];
    events?: PartialReadableSpan['events'];
    traceId: TraceId;
};
const createEvent = (name: string): PartialTimedEvent => ({
    name,
    time: hrTime(),
});
const createReadableSpan = (
    { name, duration, events = [], traceId }: ReadableSpanOptions,
) => ({
    name,
    endTime: hrTime(),
    duration,
    events,
    spanContext: () => ({ traceId }),
});

Deno.test('ServerTimingSpanExporter', async (t) => {
    await t.step('export', async (t) => {
        const exporter = new ServerTimingSpanExporter();

        await t.step(
            'should resolve to an success code while not stopped',
            async (t) => {
                const span = createReadableSpan({
                    name: 'main',
                    duration: [2, 0],
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    doneSpy.calls?.[0]?.args?.[0].code,
                    ExportResultCode.SUCCESS,
                );
                assertEquals(doneSpy.calls?.[0]?.args?.[0].error, undefined);
            },
        );

        await t.step(
            'should resolve to an error code once stopped',
            async (t) => {
                const span = createReadableSpan({
                    name: 'other',
                    duration: [2, 0],
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});

                exporter.shutdown();
                exporter.export([span], doneSpy);

                assertEquals(
                    doneSpy.calls?.[0]?.args?.[0].code,
                    ExportResultCode.FAILED,
                );
                assertEquals(
                    doneSpy.calls?.[0]?.args?.[0].error instanceof Error,
                    true,
                );
            },
        );
    });

    await t.step('getServerTimingHeader', async (t) => {
        const exporter = new ServerTimingSpanExporter();

        await t.step(
            'should work when used with a traceId',
            async (t) => {
                const span = createReadableSpan({
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    ['Server-Timing', 'main;dur=80'],
                );
            },
        );

        await t.step(
            'should work when used with an Span instance',
            async (t) => {
                const span = createReadableSpan({
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader(span),
                    ['Server-Timing', 'main;dur=80'],
                );
            },
        );

        await t.step(
            'should flush the related spans by default',
            async (t) => {
                const span = createReadableSpan({
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    ['Server-Timing', 'main;dur=80'],
                );

                // the spans with traceId '1' has been flushed
                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    ['Server-Timing', ''],
                );
            },
        );

        await t.step(
            'should be possible to avoid flushing the related spans by param',
            async (t) => {
                const span = createReadableSpan({
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader('1', { flush: false }),
                    ['Server-Timing', 'main;dur=80'],
                );

                // the spans with traceId '1' has NOT been flushed
                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    ['Server-Timing', 'main;dur=80'],
                );

                // the spans with traceId '1' has been flushed
                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    ['Server-Timing', ''],
                );
            },
        );

        await t.step(
            'should include the span events by default',
            async (t) => {
                const span = createReadableSpan({
                    events: [createEvent('cache-miss'), createEvent('fetch')],
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    ['Server-Timing', 'cache-miss,fetch,main;dur=80'],
                );
            },
        );

        await t.step(
            'should include the span events by default',
            async (t) => {
                const span = createReadableSpan({
                    events: [createEvent('cache-miss'), createEvent('fetch')],
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    ['Server-Timing', 'cache-miss,fetch,main;dur=80'],
                );
            },
        );

        await t.step(
            'should be possible to exclude the span events by param',
            async (t) => {
                const span = createReadableSpan({
                    events: [createEvent('cache-miss'), createEvent('fetch')],
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader('1', {
                        includeEvents: false,
                    }),
                    ['Server-Timing', 'main;dur=80'],
                );
            },
        );

        await t.step(
            'should include the span events sorted by time',
            async (t) => {
                const span = createReadableSpan({
                    events: [createEvent('cache-miss')],
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const secondSpan = createReadableSpan({
                    name: 'post-task',
                    duration: millisToHrTime(20),
                    traceId: '1',
                });
                span.events.push(createEvent('late'));
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span, secondSpan], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    [
                        'Server-Timing',
                        'cache-miss,main;dur=80,post-task;dur=20,late',
                    ],
                );
            },
        );
    });

    await t.step('reset', async (t) => {
        const exporter = new ServerTimingSpanExporter();

        await t.step(
            'should flush the spans but still allow for further exports',
            async (t) => {
                const span = createReadableSpan({
                    name: 'main',
                    duration: millisToHrTime(80),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span], doneSpy);

                assertEquals(
                    doneSpy.calls?.[0]?.args?.[0].code,
                    ExportResultCode.SUCCESS,
                );
                assertEquals(doneSpy.calls?.[0]?.args?.[0].error, undefined);

                exporter.reset();

                assertEquals(
                    exporter.getServerTimingHeader('1'),
                    ['Server-Timing', ''],
                );

                const otherSpan = createReadableSpan({
                    name: 'other',
                    duration: millisToHrTime(80),
                    traceId: '2',
                });
                exporter.export([otherSpan], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader('2'),
                    ['Server-Timing', 'other;dur=80'],
                );
            },
        );
    });
});
