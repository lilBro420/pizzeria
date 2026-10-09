// Servicio de Notificaciones Push & Alertas Sonoras - Pizzería Volcán POS

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null
  private audioCtx: AudioContext | null = null

  constructor() {
    this.registerServiceWorker()
  }

  // Registrar el Service Worker para Push
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        this.swRegistration = reg
        console.log('✅ Service Worker para Push registrado:', reg.scope)
        return reg
      } catch (err) {
        console.warn('⚠️ No se pudo registrar el Service Worker:', err)
        return null
      }
    }
    return null
  }

  // Comprobar soporte de notificaciones
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  // Obtener estado actual del permiso ('default' | 'granted' | 'denied')
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied'
    return Notification.permission
  }

  // Solicitar permiso al usuario
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      alert('Tu navegador o dispositivo no soporta notificaciones.')
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
        // Doble campanazo de cocina (alta frecuencia)
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
  }

  // Vibrar en dispositivos móviles (Android / tabletas con motor háptico)
  public vibrate(pattern: number[] = [200, 100, 200]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern)
      } catch {
        // ignore
      }
    }
  }

  // Enviar una Notificación Push al Sistema Operativo
  public async sendNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
    // 1. Efecto sonoro y háptico
    this.playChime((options.tag as any) || 'alert')
    this.vibrate([200, 100, 200, 100, 200])

    // 2. Si las notificaciones no están soportadas
    if (!this.isSupported()) {
      return false
    }

    let perm = this.getPermission()
    if (perm === 'default') {
      perm = await this.requestPermission()
    }

    if (perm !== 'granted') {
      return false
    }

    // 3. Intentar mostrar vía Service Worker (comportamiento push nativo)
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
    } catch (swErr) {
      console.warn('Fallback a Notification constructor:', swErr)
    }

    // 4. Fallback directo vía Notification API
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      })
      return true
    } catch (notifErr) {
      console.warn('Error al mostrar notificación:', notifErr)
      return false
    }
  }

  // Notificación de Cocina: Nueva Comanda Entrante
  public async notifyNewKitchenOrder(folio: string, itemsCount: number, detalles: string) {
    return this.sendNotification(`🍕 ¡Nueva Comanda en Cocina! ${folio}`, {
      body: `${itemsCount} productos: ${detalles}`,
      tag: 'kitchen',
      requireInteraction: true,
    })
  }

  // Notificación de Cocina a Caja: Pedido Terminado / Listo
  public async notifyOrderReady(folio: string, tipo: string, cliente?: string) {
    const destino = tipo === 'local' ? 'Mesa' : tipo === 'domicilio' ? 'Reparto' : 'Mostrador'
    return this.sendNotification(`🔔 ¡Pedido Listo para ${destino}! ${folio}`, {
      body: cliente ? `Cliente: ${cliente}. Listo para entrega.` : 'Comida preparada lista para servir.',
      tag: 'ready',
      requireInteraction: true,
    })
  }
}

export const notifications = new NotificationService()
