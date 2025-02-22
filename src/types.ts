import type { ReadableSpan, TimedEvent } from '@opentelemetry/sdk-trace-base';
import type { SpanContext } from '@opentelemetry/api';

export type TraceId = SpanContext['traceId'];
export type SpanId = SpanContext['spanId'];
export type PartialTimedEvent = Pick<TimedEvent, 'name' | 'time'>;
export type HasPartialSpanContext = {
    spanContext: () => Pick<SpanContext, 'traceId' | 'spanId'>;
};
export type PartialReadableSpan =
    & Pick<ReadableSpan, 'name' | 'duration' | 'endTime' | 'parentSpanId'>
    & { events: PartialTimedEvent[] }
    & HasPartialSpanContext;
export type GetServerTimingHeaderOptions = {
    includeEvents?: boolean;
    includeParentName?: boolean;
    includeRootParentName?: boolean;
    parentNameGlue?: string;
    flush?: boolean;
    precision?: number;
};
