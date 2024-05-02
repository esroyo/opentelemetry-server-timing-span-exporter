import {
    type ReadableSpan,
    type SpanContext,
    type TimedEvent,
} from '../deps.ts';

export type TraceId = SpanContext['traceId'];
export type PartialTimedEvent = Pick<TimedEvent, 'name'>;
export type HasPartialSpanContext = {
    spanContext: () => Pick<SpanContext, 'traceId'>;
};
export type PartialReadableSpan =
    & Pick<ReadableSpan, 'name' | 'duration'>
    & { events: PartialTimedEvent[] }
    & HasPartialSpanContext;
export type GetServerTimingHeaderOptions = {
    includeEvents?: boolean;
    flush?: boolean;
};
