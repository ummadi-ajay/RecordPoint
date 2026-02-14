import confetti from 'canvas-confetti';

// Fire confetti celebration!
export const fireConfetti = () => {
    // Multiple bursts for more impact
    const count = 200;
    const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999
    };

    function fire(particleRatio, opts) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
        });
    }

    fire(0.25, {
        spread: 26,
        startVelocity: 55,
    });
    fire(0.2, {
        spread: 60,
    });
    fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 45,
    });
};

// Side cannons confetti
export const fireSideCannons = () => {
    const end = Date.now() + 1000;

    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899'];

    (function frame() {
        confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
            zIndex: 9999
        });
        confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
            zIndex: 9999
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
};

// Stars burst
export const fireStars = () => {
    const defaults = {
        spread: 360,
        ticks: 60,
        gravity: 0,
        decay: 0.96,
        startVelocity: 20,
        shapes: ['star'],
        colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
        zIndex: 9999
    };

    confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        origin: { x: 0.5, y: 0.5 }
    });

    confetti({
        ...defaults,
        particleCount: 20,
        scalar: 0.75,
        origin: { x: 0.5, y: 0.5 }
    });
};

// Money rain! (for payment received)
export const fireMoneyRain = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 9999,
        shapes: ['circle'],
        colors: ['#10b981', '#059669', '#047857']
    };

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
            ...defaults,
            particleCount,
            origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
    }, 250);
};
