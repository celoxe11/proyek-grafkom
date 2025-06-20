// tutorialManager.js (Versi yang Diperbaiki)

export class TutorialManager {
  constructor() {
    this.steps = [];
    this.currentStep = 0;
    this.overlay = this.createOverlay();
    this.active = false;
  }

  createOverlay() {
    // Hapus overlay lama jika ada untuk mencegah duplikat saat game restart
    const oldOverlay = document.getElementById('tutorial-overlay');
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = `
      position: fixed; bottom: 40px; left: 50%;
      transform: translateX(-50%); background: rgba(0,0,0,0.8);
      color: white; padding: 15px 25px; border-radius: 8px;
      font-size: 18px; font-family: 'Poppins', sans-serif;
      z-index: 3000; pointer-events: none; text-align: center;
      max-width: 80%; transition: opacity 0.5s;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  addStep(instruction, triggerFn) {
    this.steps.push({ instruction, triggerFn });
  }

  start() {
    if (this.steps.length === 0) return;
    this.active = true;
    this.currentStep = 0;
    this.showStep(); // Hanya tampilkan langkah pertama
  }

  // Metode showStep sekarang hanya bertugas menampilkan teks
  showStep() {
    if (this.currentStep >= this.steps.length) return;
    const step = this.steps[this.currentStep];
    this.overlay.textContent = step.instruction;
  }

  // INI METODE KUNCI YANG BARU: dipanggil dari game.js
  completeStep(event) {
    if (!this.active) return; // Jangan lakukan apa-apa jika tutorial tidak aktif

    const step = this.steps[this.currentStep];
    if (!step) return; // Jangan lakukan apa-apa jika tidak ada langkah lagi

    // Periksa apakah event yang masuk memenuhi trigger
    if (step.triggerFn(event)) {
      this.currentStep++; // Lanjut ke langkah berikutnya

      if (this.currentStep < this.steps.length) {
        this.showStep(); // Tampilkan instruksi berikutnya
      } else {
        this.end(); // Selesaikan tutorial jika sudah langkah terakhir
      }
    }
  }

  end() {
    this.overlay.textContent = "Tutorial selesai! 🎉";
    setTimeout(() => {
      this.overlay.style.opacity = '0';
      setTimeout(() => this.overlay.remove(), 500);
    }, 2000);
    this.active = false;
  }
}