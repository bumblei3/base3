/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
/**
 * Shared Event Emitter - Typed event system
 */

type EventCallback<T = any> = (data: T) => void;
type EventMap = Record<string, any>;

export class EventEmitter<E extends EventMap = EventMap> {
  private listeners: Map<keyof E, Set<EventCallback>> = new Map();

  on<K extends keyof E>(event: K, callback: EventCallback<E[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof E>(event: K, callback: EventCallback<E[K]>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<K extends keyof E>(event: K, data: E[K]): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventEmitter] Error in ${String(event)} listener:`, err);
      }
    });
  }

  once<K extends keyof E>(event: K, callback: EventCallback<E[K]>): void {
    const wrapper = (data: E[K]) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  removeAllListeners(event?: keyof E): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: keyof E): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// Pre-defined game events
export interface GameEvents {
  [key: string]: any;
  'game:start': { variant: 'schach9x9' | 'trischach'; timeControl: { initial: number; increment: number } };
  'game:end': { result: 'white' | 'black' | 'fire' | 'water' | 'nature' | 'draw'; reason: string };
  'move:made': { move: { from: { row: number; col: number }; to: { row: number; col: number }; piece: string; san: string } };
  'move:undone': { move: { from: { row: number; col: number }; to: { row: number; col: number } } };
  'piece:captured': { piece: string; by: string; position: { row: number; col: number } };
  'piece:promoted': { piece: string; to: string; position: { row: number; col: number } };
  'check': { color: 'white' | 'black' | 'fire' | 'water' | 'nature' };
  'checkmate': { winner: 'white' | 'black' | 'fire' | 'water' | 'nature' };
  'stalemate': { color: 'white' | 'black' | 'fire' | 'water' | 'nature' };
  'draw': { reason: 'stalemate' | 'insufficient-material' | 'threefold' | 'fifty-move' | 'agreement' };
  'time:update': { color: string; time: number };
  'time:warning': { color: string; time: number };
  'time:out': { color: string };
  'ai:thinking': { depth: number; nodes: number; score: number };
  'ai:move': { move: { from: { row: number; col: number }; to: { row: number; col: number } }; score: number };
  'board:resize': { width: number; height: number };
  'ui:panel:open': { panel: string };
  'ui:panel:close': { panel: string };
  'settings:change': { key: string; value: unknown };
  'sound:play': { name: string; volume?: number };
  'error': { message: string; context?: Record<string, unknown> };
}

// Global event bus
export const gameEvents = new EventEmitter<GameEvents>();

// Helper for React-like components
export function useEvent<K extends keyof GameEvents>(
  emitter: EventEmitter<GameEvents>,
  event: K,
  callback: (data: GameEvents[K]) => void,
  _deps: unknown[] = []
): () => void {
  // This would be used in a React-like hook system
  // For vanilla JS, just use emitter.on directly
  return emitter.on(event, callback);
}

// Debounced event emitter
export class DebouncedEventEmitter<E extends EventMap = EventMap> extends EventEmitter<E> {
  private timers: Map<keyof E, number> = new Map();
  private delay: number;

  constructor(delay = 150) {
    super();
    this.delay = delay;
  }

  emitDebounced<K extends keyof E>(event: K, data: E[K]): void {
    const existing = this.timers.get(event);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = window.setTimeout(() => {
      this.emit(event, data);
      this.timers.delete(event);
    }, this.delay);
    this.timers.set(event, timer);
  }

  flush(event?: keyof E): void {
    if (event) {
      const timer = this.timers.get(event);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(event);
      }
    } else {
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers.clear();
    }
  }
}
