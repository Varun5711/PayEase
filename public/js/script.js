const text = "-Rupee";
const typingText = document.getElementById("typingText");

function typeEffect() {
    for (let i = 0; i <= text.length; i++) {
        setTimeout(() => {
            typingText.innerHTML = text.substring(0, i);
        }, i * 100);
    }
}

typeEffect();

setInterval(() => {
    typeEffect();
}, text.length * 100 + 2000);

gsap.from("#logo", { duration: 1, opacity: 0, x: -50, ease: "power2.out" });
gsap.from("#brand-text", { duration: 1, opacity: 0, x: 50, ease: "power2.out", delay: 0.2 });
gsap.from("#headline", { duration: 1.2, opacity: 0, y: -30, ease: "bounce.out", delay: 0.5 });
gsap.from("#subtext", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.8 });
gsap.from("#signup-btn", { duration: 1, opacity: 0, scale: 0.5, ease: "elastic.out(1, 0.5)", delay: 1 });

document.addEventListener("DOMContentLoaded", () => {
    gsap.fromTo(
        "h1, h2, h3, p, a.btn",
        {
            opacity: 0,
            filter: "blur(10px)",
            y: 50,
        },
        {
            opacity: 1,
            filter: "blur(0px)",
            y: 0,
            duration: 1.5,
            stagger: 0.2,
            ease: "power2.out",
        }
    );
});