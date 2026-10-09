// Servicio de Notificaciones Push & Alertas Sonoras - Pizzería Volcán POS

export interface InAppNotification {
  id: string
  title: string
  body: string
  tag?: string
  timestamp: number
}

type NotificationListener = (notif: InAppNotification) => void

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null
  private audioCtx: AudioContext | null = null
  private listeners: Set<NotificationListener> = new Set()

  constructor() {
    this.registerServiceWorker()
    this.initAudioUnlock()
  }

  // Desbloqueo proactivo de audio en iOS Safari en el primer toque del usuario
  private initAudioUnlock() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio()
        window.removeEventListener('touchstart', unlock)
        window.removeEventListener('click', unlock)
      }
      window.addEventListener('touchstart', unlock, { passive: true })
      window.addEventListener('click', unlock, { passive: true })
    }
  }

  public unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx()
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume()
      }
    } catch {
      // ignore
    }
  }

  // Detectar si el dispositivo es iOS (iPhone / iPad)
  public isIOSDevice(): boolean {
    if (typeof navigator === 'undefined') return false
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    )
  }

  // Registrar el Service Worker para Push
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        this.swRegistration = reg
        return reg
      } catch (err) {
        return null
      }
    }
    return null
  }

  // Comprobar soporte de notificaciones nativas del sistema operativo
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  // Obtener estado actual del permiso ('default' | 'granted' | 'denied')
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return this.isIOSDevice() ? 'default' : 'denied'
    }
    return Notification.permission
  }

  // Suscribirse a notificaciones flotantes en pantalla (In-App Banner)
  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Solicitar permiso al usuario
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      if (this.isIOSDevice()) {
        // En iOS Safari normal, Apple no expone la API Notification a menos que esté en pantalla de inicio.
        // Las notificaciones in-app se activan automáticamente.
        return 'granted'
      }
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      return permission
    } catch (err) {
      console.error('Error al solicitar permiso de notificaciones:', err)
      return 'denied'
    }
  }

  // Reproducir sonido de campana / chime usando Web Audio API
  public playChime(type: 'kitchen' | 'ready' | 'alert' = 'alert') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx()
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume()
      }

      const now = this.audioCtx.currentTime

      if (type === 'kitchen') {
        // Campanazo de cocina
        this.playTone(880, now, 0.25)
        this.playTone(1174.66, now + 0.15, 0.4)
      } else if (type === 'ready') {
        // Tono ascendente de orden lista
        this.playTone(523.25, now, 0.15)
        this.playTone(659.25, now + 0.12, 0.15)
        this.playTone(783.99, now + 0.24, 0.35)
      } else {
        // Alerta estándar
        this.playTone(587.33, now, 0.2)
        this.playTone(880, now + 0.15, 0.3)
      }
    } catch (e) {
      console.warn('Audio feedback no disponible:', e)
    }
  }

  private playTone(freq: number, start: number, duration: number) {
    if (!this.audioCtx) return
    try {
      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.3, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

      osc.connect(gain)
      gain.connect(this.audioCtx.destination)

      osc.start(start)
      osc.stop(start + duration)
    } catch {
      // ignore audio errors
    }
  }

  // Vibrar en dispositivos móviles (Android / iPhone háptico)
  public vibrate(pattern: number[] = [200, 100, 200]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern)
      } catch {
        // ignore
      }
    }
  }

  // Enviar una Notificación Push (emite In-App Banner + Notificación nativa OS)
  public async sendNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
    // 1. Efecto sonoro y háptico
    this.playChime((options.tag as any) || 'alert')
    this.vibrate([200, 100, 200, 100, 200])

    // 2. Disparar banner flotante interactivo (Garantiza visibilidad 100% en iPhone)
    const inAppItem: InAppNotification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      title,
      body: (options.body as string) || '',
      tag: options.tag,
      timestamp: Date.now(),
    }
    this.listeners.forEach(fn => fn(inAppItem))

    // 3. Si soporta notificaciones del sistema operativo
    if (this.isSupported()) {
      let perm = this.getPermission()
      if (perm === 'default') {
        perm = await this.requestPermission()
      }

      if (perm === 'granted') {
        // Intentar vía Service Worker
        try {
          if (this.swRegistration && 'showNotification' in this.swRegistration) {
            await this.swRegistration.showNotification(title, {
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              vibrate: [200, 100, 200],
              ...options,
            })
            return true
          }
        } catch {
          // Fallback a Notification API
        }

        try {
          new Notification(title, {
            icon: '/favicon.ico',
            ...options,
          })
          return true
        } catch {
          // fallback
        }
      }
    }

    // Retorna true porque se desplegó el banner sonoro/visual en el dispositivo
    return true
  }

  // Notificación de Cocina: Nueva Comanda Entrante
  public async notifyNewKitchenOrder(folio: string, itemsCount: number, detalles: string) {
    return this.sendNotification(`Nueva Comanda en Cocina: ${folio}`, {
      body: `${itemsCount} productos: ${detalles}`,
      tag: 'kitchen',
      requireInteraction: true,
    })
  }

  // Notificación de Cocina a Caja: Pedido Terminado / Listo
  public async notifyOrderReady(folio: string, tipo: string, cliente?: string) {
    const destino = tipo === 'local' ? 'Mesa' : tipo === 'domicilio' ? 'Reparto' : 'Mostrador'
    return this.sendNotification(`Pedido Listo para ${destino}: ${folio}`, {
      body: cliente ? `Cliente: ${cliente}. Listo para entrega.` : 'Comida preparada lista para servir.',
      tag: 'ready',
      requireInteraction: true,
    })
  }
}

export const notifications = new NotificationService()
