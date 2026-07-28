// src/components/Footer.jsx
import React, { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Footer.css";

gsap.registerPlugin(ScrollTrigger);

// Footer is split into two parts:
// 1. A scroll-driven hero showcase built with SVG and GSAP.
// 2. A standard site footer with navigation and contact links.
export default function Footer() {
  return (
    <>
      <HeroShowcase />
      <FooterFull />
    </>
  );
}

const CANVAS_W = 1600;
const CANVAS_H = 900;
const WORD = "C.S.E.D";
const ZOOM_LETTER_INDEX = 4; // C(0) .(1) S(2) .(3) E(4) .(5) D(6)
const E_ANCHOR_X_FACTOR = 0.4;
const OPEN_SCALE_MULTIPLIER = 1.8;
const FONT_SIZE = 320;
const FONT_WEIGHT = 900;
const LETTER_SPACING = 6; // only affects the hidden measurement run

const CLOSING_COLOR = "#f5f5f5";
const HOVER_COLOR = "#E11D2E";
const HOVER_SCALE = 1.18;
const IMAGE_START_SCALE = 1.12;

// Scroll animation section: the masked image reveals through the C.S.E.D
// letters, then transitions to the solid closing version.
export function HeroShowcase({
  imageUrl = "https://picsum.photos/seed/csed-hero/1600/900",
}) {
  const rootRef = useRef(null);
  const svgRef = useRef(null);
  const hiddenRunRef = useRef(null); // measurement-only, never shown
  const photoLayerRef = useRef(null);
  const maskGroupRef = useRef(null);
  const closingGroupRef = useRef(null);
  const imgGroupRef = useRef(null);
  const glyphRefs = useRef([]);
  const glyphCenters = useRef([]);

  // Shared letter positions used by both the mask and the interactive text.
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    const hiddenRun = hiddenRunRef.current;
    const photoLayer = photoLayerRef.current;
    const maskGroup = maskGroupRef.current;
    const closingGroup = closingGroupRef.current;
    const imgGroup = imgGroupRef.current;
    if (!root || !svg || !hiddenRun || !photoLayer || !maskGroup || !closingGroup || !imgGroup) return;

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    // Measure the hidden reference text once so every visible letter uses
    // the exact same positions.
    let computedLayout = null;
    let eAnchorX = CANVAS_W * 0.3;
    let eAnchorY = CANVAS_H * 0.5;
    let eStrokeSpan = CANVAS_W * 0.02;

    try {
      computedLayout = WORD.split("").map((ch, i) => {
        const start = hiddenRun.getStartPositionOfChar(i);
        const end = hiddenRun.getEndPositionOfChar(i);
        const x = (start.x + end.x) / 2;
        glyphCenters.current[i] = { x, y: cy };
        return { char: ch, x };
      });

      const extent = hiddenRun.getExtentOfChar(ZOOM_LETTER_INDEX);
      eAnchorX = extent.x + extent.width * E_ANCHOR_X_FACTOR;
      eAnchorY = extent.y + extent.height * 0.5;
      eStrokeSpan = extent.width * 0.34;
    } catch {
      // Fallback for browsers that do not support SVG text measurement.
      const approxSpacing = FONT_SIZE * 0.62;
      const totalWidth = approxSpacing * (WORD.length - 1);
      computedLayout = WORD.split("").map((ch, i) => ({
        char: ch,
        x: cx - totalWidth / 2 + i * approxSpacing,
      }));
      computedLayout.forEach((g, i) => (glyphCenters.current[i] = { x: g.x, y: cy }));
    }

    setLayout(computedLayout);

    // Prepare the mask transformation so the letter cutout can shrink into
    // place as the page scrolls.
    const scale0 = (CANVAS_W / eStrokeSpan) * OPEN_SCALE_MULTIPLIER;
    const maskState = {
      scale: scale0,
      tx: cx - scale0 * eAnchorX,
      ty: cy - scale0 * eAnchorY,
    };
    const applyMaskTransform = () => {
      maskGroup.setAttribute(
        "transform",
        `translate(${maskState.tx} ${maskState.ty}) scale(${maskState.scale})`
      );
    };
    applyMaskTransform();

    // Keep the background image zoomed slightly at the start for depth.
    const imgState = { scale: IMAGE_START_SCALE };
    const applyImgTransform = () => {
      imgGroup.setAttribute(
        "transform",
        `translate(${cx} ${cy}) scale(${imgState.scale}) translate(${-cx} ${-cy})`
      );
    };
    applyImgTransform();

    const ctx = gsap.context(() => {
      gsap.set(closingGroup, { autoAlpha: 0 });
      gsap.set(photoLayer, { autoAlpha: 1 });

      // ScrollTrigger pins the hero section while the reveal animation plays.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=1400",
          scrub: 0.7,
          pin: true,
          anticipatePin: 0.5,
        },
      });

      tl.to({}, { duration: 0.15 });

      // Shrink the mask and settle the image into its final resting state.
      tl.to(maskState, {
        scale: 1,
        tx: 0,
        ty: 0,
        duration: 1.2,
        ease: "power3.inOut",
        onUpdate: applyMaskTransform,
      }, "shrink");

      // Zoom the image to match the final composition of the text reveal.
      tl.to(imgState, {
        scale: 1,
        duration: 1.2,
        ease: "power3.inOut",
        onUpdate: applyImgTransform,
      }, "shrink");

      tl.to({}, { duration: 0.25 });

      // Fade in the final text layer while fading out the photo layer.
      tl.to(closingGroup, { autoAlpha: 1, duration: 0.35, ease: "power1.inOut" }, "solid");
      tl.to(photoLayer, { autoAlpha: 0, duration: 0.35, ease: "power1.inOut" }, "solid");
    }, root);

    return () => ctx.revert();
  }, [imageUrl]);

  const applyGlyphTransform = (el, scale) => {
    const c = glyphCenters.current[Number(el.dataset.idx)];
    if (!c) return;
    el.setAttribute(
      "transform",
      `translate(${c.x} ${c.y}) scale(${scale}) translate(${-c.x} ${-c.y})`
    );
  };

  // Hover animation for each letter in the closing word mark.
  const handleGlyphEnter = (i) => () => {
    const el = glyphRefs.current[i];
    if (!el) return;
    const proxy = { scale: 1 };
    gsap.to(el, { fill: HOVER_COLOR, duration: 0.3, overwrite: "auto" });
    gsap.to(proxy, {
      scale: HOVER_SCALE,
      duration: 0.35,
      ease: "back.out(3)",
      overwrite: "auto",
      onUpdate: () => applyGlyphTransform(el, proxy.scale),
    });
    el.classList.add("svg-glyph--hover");
  };

  // Restore the default letter style when the pointer leaves.
  const handleGlyphLeave = (i) => () => {
    const el = glyphRefs.current[i];
    if (!el) return;
    const proxy = { scale: HOVER_SCALE };
    gsap.to(el, { fill: CLOSING_COLOR, duration: 0.35, overwrite: "auto" });
    gsap.to(proxy, {
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
      overwrite: "auto",
      onUpdate: () => applyGlyphTransform(el, proxy.scale),
    });
    el.classList.remove("svg-glyph--hover");
  };

  return (
    <section className="hero-root" ref={rootRef} aria-label="CSED showcase">
      <svg
        ref={svgRef}
        className="hero-svg"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        {/* Hidden text used only for measuring letter positions. */}
        <text
          ref={hiddenRunRef}
          x={CANVAS_W / 2}
          y={CANVAS_H / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={FONT_SIZE}
          fontWeight={FONT_WEIGHT}
          letterSpacing={LETTER_SPACING}
          className="svg-text"
          style={{ opacity: 0 }}
        >
          {WORD}
        </text>

        {/* SVG mask that reveals the photo through the word shape. */}
        <defs>
          <mask
            id="csed-letters-mask"
            maskUnits="userSpaceOnUse"
            x="0" y="0" width={CANVAS_W} height={CANVAS_H}
          >
            <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="#000" />
            <g ref={maskGroupRef}>
              {layout &&
                layout.map((g, i) => (
                  <text
                    key={i}
                    x={g.x}
                    y={CANVAS_H / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#fff"
                    fontSize={FONT_SIZE}
                    fontWeight={FONT_WEIGHT}
                    className="svg-text"
                  >
                    {g.char}
                  </text>
                ))}
            </g>
          </mask>
        </defs>

        {/* Dark background behind the masked image. */}
        <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="#050505" />

        {/* Photo layer that is clipped by the animated letter mask. */}
        <g ref={photoLayerRef} mask="url(#csed-letters-mask)">
          <g ref={imgGroupRef}>
            <image
              href={imageUrl}
              x="0" y="0"
              width={CANVAS_W}
              height={CANVAS_H}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </g>

        {/* Final text layer that appears after the image reveal completes. */}
        <g ref={closingGroupRef}>
          {layout &&
            layout.map((g, i) => (
              <text
                key={i}
                ref={(el) => (glyphRefs.current[i] = el)}
                data-idx={i}
                x={g.x}
                y={CANVAS_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={CLOSING_COLOR}
                fontSize={FONT_SIZE}
                fontWeight={FONT_WEIGHT}
                className="svg-text svg-glyph"
                onMouseEnter={handleGlyphEnter(i)}
                onMouseLeave={handleGlyphLeave(i)}
              >
                {g.char}
              </text>
            ))}
        </g>
      </svg>
    </section>
  );
}

/* ---------------------------
   FooterFull
   --------------------------- */
export function FooterFull() {
  return (
    <footer className="site-footer" id="site-footer">
      <div className="footer-inner">
        {/* Top row with brand copy and grouped links. */}
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand-logo">C.S.E.D</div>
            <p className="brand-desc">
              Centre for Social Entrepreneurship & Development — connecting students,
              industry and community through projects, events and learning.
            </p>
          </div>

          {/* Quick navigation, resources, and contact columns. */}
          <div className="footer-columns">
            <div className="col">
              <h4>Menu</h4>
              <ul>
                <li><a href="#about">About Us</a></li>
                <li><a href="#events">Events</a></li>
                <li><a href="#team">Dev Team</a></li>
                <li><a href="#blog">Blog</a></li>
              </ul>
            </div>

            <div className="col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#projects">Projects</a></li>
                <li><a href="#docs">Docs</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#sponsors">Sponsors</a></li>
              </ul>
            </div>

            <div className="col">
              <h4>Contact</h4>
              <ul>
                <li><a href="mailto:csed@vit.ac.in">csed@vit.ac.in</a></li>
                <li><a href="#location">VIT, Katpadi</a></li>
                <li><a href="#join">Join our team</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row with social links and copyright. */}
        <div className="footer-links">
          <div className="socials">
            <a href="#instagram">Instagram</a>
            <a href="#linkedin">LinkedIn</a>
            <a href="#x">X</a>
            <a href="#medium">Medium</a>
            <a href="#whatsapp">WhatsApp</a>
          </div>

          <div className="legal">
            <small>© 2026 CSED VIT. All Rights Reserved.</small>
            <a href="#top" className="back-top">Back to top ↑</a>
          </div>
        </div>
      </div>
    </footer>
  );
}