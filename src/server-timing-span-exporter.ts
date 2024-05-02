import {
    type ExportResult,
    ExportResultCode,
    type ReadableSpan,
    type Span,
    type SpanExporter,
} from '../deps.ts';

import type {
    GetServerTimingHeaderOptions,
    HasPartialSpanContext,
    PartialReadableSpan,
    TraceId,
} from './types.ts';

import { hrTimeToMilliseconds } from './utils.ts';

/**
 * This class can be used to output a [Server-Timing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing) header.
 *
 * Internally It stores the exported spans in lists indexed by trace id.
 *
 * Use the {@link ServerTimingSpanExporter.getServerTimingHeader|getServerTimingHeader} method to obtain a header pair.
 * The method requires as a parameter, either the trace id or an {@link Span}
 * instance (probably a root span).
 *
 * ## Usage
 *
 * ```ts
 * import opentelemetry from '@opentelemetry/api';
 * import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
 * import { ServerTimingSpanExporter } from '@esroyo/otlp-server-timing-span-exporter';
 *
 * const provider = new BasicTracerProvider();
 * const exporter = new ServerTimingSpanExporter();
 * provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
 * provider.register();
 *
 * const tracer = opentelemetry.trace.getTracer('default');
 * const parentSpan = tracer.startSpan('main');
 * parentSpan.addEvent('start');
 * parentSpan.end();
 *
 * const responseHeaders = new Headers();
 * responseHeaders.set(...exporter.getServerTimingHeader(parentSpan));
 * console.log(responseHeaders);
 * // Headers { "server-timing": "start,main;dur=0.269936" }
 * ```
 */
export class ServerTimingSpanExporter implements SpanExporter {
    /**
     * Indicates if the exporter has been "shutdown."
     * When false, exported spans will not be stored in-memory.
     */
    private _stopped: boolean = false;

    private _finishedSpans = new Map<TraceId, PartialReadableSpan[]>();

    /**
     * Called to export sampled {@link ReadableSpan}s.
     *
     * @param spans - The list of sampled Spans to be exported.
     */
    export(
        spans: PartialReadableSpan[],
        resultCallback: (result: ExportResult) => void,
    ): void {
        if (this._stopped) {
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Exporter has been stopped'),
            });
        }
        for (const span of spans) {
            const { traceId } = span.spanContext();
            const spanList = this._finishedSpans.get(traceId) ?? [];
            spanList.push(span);
            this._finishedSpans.set(traceId, spanList);
        }
        resultCallback({ code: ExportResultCode.SUCCESS });
    }

    /** Stops the exporter. */
    shutdown(): Promise<void> {
        this._stopped = true;
        this._finishedSpans = new Map();
        return this.forceFlush();
    }

    /**
     * Exports any pending spans in the exporter
     */
    forceFlush(): Promise<void> {
        return Promise.resolve();
    }

    reset(): void {
        this._finishedSpans = new Map();
    }

    /**
     * Called to build a Server-Timing header.
     *
     * Example output:
     * ```
     * ["Server-Timing", "doWork;dur=0.464583,main;dur=3.609739"]
     * ```
     *
     * @param traceIdOrSpan - The root Span or its traceId to build the headers for.
     * @param options.includeEvents - The span events will be included as metrics without duration.
     * @param options.flush - Remove the spans from memory
     */
    getServerTimingHeader(
        traceIdOrSpan: TraceId | HasPartialSpanContext,
        { includeEvents = true, flush = true }: GetServerTimingHeaderOptions =
            {},
    ): ['Server-Timing', string] {
        const traceId = typeof traceIdOrSpan === 'string'
            ? traceIdOrSpan
            : traceIdOrSpan.spanContext().traceId;
        const spanList = this._finishedSpans.get(traceId) ?? [];
        if (flush) {
            this._finishedSpans.delete(traceId);
        }
        return [
            'Server-Timing',
            spanList
                .flatMap((span) => this._exportInfo(span, includeEvents))
                .map(({ name, duration }) =>
                    `${name}${
                        typeof duration !== 'number' ? '' : `;dur=${duration}`
                    }`
                )
                .join(','),
        ];
    }

    /**
     * Converts span info into simple { name, duration } objects.
     */
    private _exportInfo(span: PartialReadableSpan, includeEvents: boolean) {
        const entry = {
            duration: hrTimeToMilliseconds(span.duration),
            name: span.name,
        };
        return includeEvents
            ? [
                ...span.events.map(({ name }) => ({ name, duration: null })),
                entry,
            ]
            : [entry];
    }
}
