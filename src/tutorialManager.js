// tutorialManager.js
export class TutorialManager {
  constructor() {
    this.steps = [];
    this.currentStep = 0;
    this.overlay = this.createOverlay();
    this.active = false;
  }

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 18px;
      font-family: 'Poppins', sans-serif;
      z-index: 3000;
      pointer-events: none;
      text-align: center;
      max-width: 80%;
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
    this.showStep();
  }

  showStep() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    this.overlay.textContent = step.instruction;

    const listener = (event) => {
      if (step.triggerFn(event)) {
        document.removeEventListener('keydown', listener);
        this.currentStep++;
        if (this.currentStep < this.steps.length) {
          this.showStep();
        } else {
          this.end();
        }
      }
    };

    document.addEventListener('keydown', listener);
  }

  end() {
    this.overlay.textContent = "Tutorial selesai! 🎉";
    setTimeout(() => {
      this.overlay.remove();
    }, 3000);
    this.active = false;
  }
}
