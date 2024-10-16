import {
    ExportResult,
    ExportResultCode,
    hrTime,
    millisToHrTime,
} from '../deps.ts';
import { assertEquals, spy } from '../dev_deps.ts';
import {
    PartialReadableSpan,
    PartialTimedEvent,
    SpanId,
    TraceId,
} from './types.ts';

import { ServerTimingSpanExporter } from './server-timing-span-exporter.ts';

type ReadableSpanOptions = {
    name: PartialReadableSpan['name'];
    duration: PartialReadableSpan['duration'];
    events?: PartialReadableSpan['events'];
    traceId: TraceId;
    spanId?: SpanId;
    parentSpanId?: SpanId;
};
const createEvent = (name: string): PartialTimedEvent => ({
    name,
    time: hrTime(),
});
const createReadableSpan = (
    {
        name,
        duration,
        events = [],
        parentSpanId,
        spanId = crypto.randomUUID(),
        traceId,
    }: ReadableSpanOptions,
): PartialReadableSpan => ({
    name,
    endTime: hrTime(),
    duration,
    events,
    parentSpanId,
    spanContext: () => ({ traceId, spanId }),
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
            'should build a breadcrumb hierarchy for span names (by default)',
            async (t) => {
                const mainSpan = createReadableSpan({
                    name: 'main',
                    duration: millisToHrTime(110),
                    traceId: '1',
                });
                const childSpan = createReadableSpan({
                    name: 'child',
                    duration: millisToHrTime(42),
                    traceId: '1',
                    parentSpanId: mainSpan.spanContext().spanId,
                });
                const otherChildSpan = createReadableSpan({
                    name: 'other-child',
                    duration: millisToHrTime(60),
                    traceId: '1',
                    parentSpanId: mainSpan.spanContext().spanId,
                });
                const childChildSpan = createReadableSpan({
                    name: 'child',
                    duration: millisToHrTime(40),
                    traceId: '1',
                    parentSpanId: otherChildSpan.spanContext().spanId,
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([
                    mainSpan,
                    childSpan,
                    otherChildSpan,
                    childChildSpan,
                ], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader(mainSpan, {
                        parentNameGlue: ' > ',
                    }),
                    [
                        'Server-Timing',
                        'main;dur=110,main > child;dur=42,main > other-child;dur=60,main > other-child > child;dur=40',
                    ],
                );
            },
        );

        await t.step(
            'should not build a breadcrumb hierarchy for span names when option { includeParentName: false } is used',
            async (t) => {
                const mainSpan = createReadableSpan({
                    name: 'main',
                    duration: millisToHrTime(110),
                    traceId: '1',
                });
                const childSpan = createReadableSpan({
                    name: 'child',
                    duration: millisToHrTime(42),
                    traceId: '1',
                    parentSpanId: mainSpan.spanContext().spanId,
                });
                const otherChildSpan = createReadableSpan({
                    name: 'other-child',
                    duration: millisToHrTime(60),
                    traceId: '1',
                    parentSpanId: mainSpan.spanContext().spanId,
                });
                const childChildSpan = createReadableSpan({
                    name: 'child',
                    duration: millisToHrTime(40),
                    traceId: '1',
                    parentSpanId: otherChildSpan.spanContext().spanId,
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([
                    mainSpan,
                    childSpan,
                    otherChildSpan,
                    childChildSpan,
                ], doneSpy);

                assertEquals(
                    exporter.getServerTimingHeader(mainSpan, {
                        includeParentName: false,
                    }),
                    [
                        'Server-Timing',
                        'main;dur=110,child;dur=42,other-child;dur=60,child;dur=40',
                    ],
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
            'should be possible to specify the precision by param',
            async (t) => {
                const span = createReadableSpan({
                    name: 'main',
                    duration: millisToHrTime(10.12345),
                    traceId: '1',
                });
                const secondSpan = createReadableSpan({
                    name: 'post-task',
                    duration: millisToHrTime(5),
                    traceId: '1',
                });
                const doneSpy = spy((_result: ExportResult) => {});
                exporter.export([span, secondSpan], doneSpy);

                // Without specifying precision
                assertEquals(
                    exporter.getServerTimingHeader('1', { flush: false }),
                    [
                        'Server-Timing',
                        'main;dur=10.12345,post-task;dur=5',
                    ],
                );

                // With precision >0
                assertEquals(
                    exporter.getServerTimingHeader('1', {
                        flush: false,
                        precision: 2,
                    }),
                    [
                        'Server-Timing',
                        'main;dur=10.12,post-task;dur=5',
                    ],
                );

                // With precision 0
                assertEquals(
                    exporter.getServerTimingHeader('1', {
                        flush: true,
                        precision: 0,
                    }),
                    [
                        'Server-Timing',
                        'main;dur=10,post-task;dur=5',
                    ],
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
