// SPDX-License-Identifier: MPL-2.0
// Only body chunks enter the meter. Progress offsets, disk reads and cache hits
// may advance installation progress without transferring a single network byte.
const seconds = 60;
export class DownloadDiagnostics {
  constructor(clock = () => performance.now()) {
    this.clock = clock;
    this.buckets = new Map();
    this.active = new Map();
    this.sources = [];
    this.modes = new Set();
    this.peakFiles = 0;
    this.peakStreams = 0;
    this.retries = 0;
    this.fallbacks = 0;
    this.resumed = false;
  }
  configure(config) {
    this.config = config;
    this.start ??= this.clock();
  }
  second() { return Math.floor(((this.end ?? this.clock()) - this.start) / 1000); }
  bytes(count, appliedBytesPerSecond) {
    if (!Number.isSafeInteger(count) || count <= 0 || this.paused || this.end != null) return;
    const second = this.second();
    this.firstByte ??= second;
    this.lastByte = second;
    this.appliedKib = Number.isFinite(appliedBytesPerSecond) ? appliedBytesPerSecond / 1024 : null;
    const index = second % (seconds + 1);
    const old = this.buckets.get(index);
    if (old?.second === second) old.bytes += count;
    else this.buckets.set(index, {second, bytes:count});
  }
  sample(second) {
    if (this.firstByte == null || second < this.firstByte) return null;
    const bucket = this.buckets.get(second % (seconds + 1));
    return bucket?.second === second ? bucket.bytes : 0;
  }
  speed() {
    if (this.end != null || this.paused) return 0;
    const second = this.second() - 1;
    if (second <= this.resumeSecond) return null;
    return this.sample(second);
  }
  stream(file, ranges, source, resumed) {
    const active = (this.active.get(file) || 0) + 1;
    this.active.set(file, active);
    this.peakFiles = Math.max(this.peakFiles, this.active.size);
    this.peakStreams = Math.max(this.peakStreams, active);
    this.modes.add(ranges);
    this.resumed ||= resumed;
    if (source && this.sources.at(-1) !== source) {
      this.sources.push(source);
      if (this.sources.length > 6) this.sources.shift();
    }
    return () => {
      const remaining = this.active.get(file) - 1;
      if (remaining) this.active.set(file, remaining);
      else this.active.delete(file);
    };
  }
  fallback(from,to) {
    this.fallbacks++;
    this.lastFallback = [from,to];
  }
  pause(value) {
    this.paused = value;
    if (!value) this.resumeSecond = this.second();
  }
  finish() { this.end = this.clock(); }
  snapshot() {
    if (!this.config) return null;
    // Completed buckets use a full one-second denominator. Include a final
    // partial bucket on termination, also normalized to one second.
    const last = this.end == null ? this.second() - 1 : (this.lastByte ?? this.second());
    const first = Math.max(0, last - seconds + 1);
    const history = Array.from({length: Math.max(0, last - first + 1)}, (_, i) => this.sample(first + i));
    return {config: this.config, appliedKib:this.appliedKib, history, speed: this.speed(), files: this.active.size,
      peakFiles: this.peakFiles, peakStreams: this.peakStreams, modes: [...this.modes],
      sources: [...this.sources], lastFallback:this.lastFallback, resumed: this.resumed, retries: this.retries, fallbacks: this.fallbacks};
  }
}
