# opentelemetry ServerTimingSpanExporter

[![codecov](https://codecov.io/gh/esroyo/opentelemetry-server-timing-span-exporter/graph/badge.svg?token=OVVLMQFJ3A)](https://codecov.io/gh/esroyo/opentelemetry-server-timing-span-exporter)

An expoter that can be used to output a [Server-Timing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing) header.
 
## Usage

```ts
import opentelemetry from '@opentelemetry/api';
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ServerTimingSpanExporter } from '@esroyo/opentelemetry-server-timing-span-exporter';

const provider = new BasicTracerProvider();
const exporter = new ServerTimingSpanExporter();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

const tracer = opentelemetry.trace.getTracer('default');
const parentSpan = tracer.startSpan('main');
parentSpan.addEvent('start');
parentSpan.end();

const responseHeaders = new Headers();
responseHeaders.set(...exporter.getServerTimingHeader(parentSpan));
console.log(responseHeaders);
// Headers { "server-timing": "start,main;dur=0.269936" }
```
