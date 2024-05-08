import {
    type ReadableSpan,
    type SpanContext,
    type TimedEvent,
} from '../deps.ts';

export type TraceId = SpanContext['traceId'];
export type PartialTimedEvent = Pick<TimedEvent, 'name' | 'time'>;
export type HasPartialSpanContext = {
    spanContext: () => Pick<SpanContext, 'traceId'>;
};
export type PartialReadableSpan =
    & Pick<ReadableSpan, 'name' | 'duration' | 'endTime'>
    & { events: PartialTimedEvent[] }
    & HasPartialSpanContext;
export type GetServerTimingHeaderOptions = {
    includeEvents?: boolean;
    flush?: boolean;
};
