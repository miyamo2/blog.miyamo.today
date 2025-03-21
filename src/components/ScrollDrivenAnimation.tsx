import React from "react";

export const ScrollDrivenAnimationStyle = () => {
  // In the style tag instead of css,
  // since it must be loadable from the scroll-driven-animation's polyfill
  return (
    <style type="text/css">
      {`
      @property --scroll {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
      }
      
      @property --scroll-delayed {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
      }
      
      @property --scroll-direction {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
      }
      
      @property --scroll-end {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
      }
      
      @keyframes setRootScrollProps {
          to {
              --scroll: 1000;
              --scroll-delayed: 1000;
          }
      }
      
      :root {
          animation-name: setRootScrollProps !important;
          animation-easing-function: linear !important;
          animation-fill-mode: both !important;
          animation-timeline: scroll(root) !important;
          --effect-duration: .5s;
      }
      
      body {
          transition: --scroll-delayed calc(var(--effect-duration) + .01s) !important;
          --scroll-velocity: calc(var(--scroll) - var(--scroll-delayed));
          --scroll-speed: max(var(--scroll-velocity), -1 * var(--scroll-velocity));
          --scroll-direction: calc(var(--scroll-velocity) / var(--scroll-speed));
          --scroll-end: calc(var(--scroll) / 1000);
      }
      
      .hidden-when-scroll-down,
      #bmc-wbtn {
          --transition-delay: calc(infinity * 1s);
          --translate: 0;
          
          will-change: transform !important;
          transition: transform var(--effect-duration) !important;
          transition-delay: var(--transition-delay) !important;
          transform: translateY(var(--translate)) !important;
      
          -webkit-backface-visibility: hidden !important;
          backface-visibility: hidden !important;
      
          @container style(--scroll-direction: 0) {
              --transition-delay: calc(infinity * 1s);
          }
      
          @container style(not (--scroll-direction: 0)) {
              --transition-delay: 0s;
          }
      
          @container style(--scroll-direction: -1) {
              --translate: 0;
          }
      
          @container style(--scroll-direction: 1) {
              --translate: 101vh;
          }
      
          @container style(--scroll-end: 1) {
              --translate: 0;
          }
      }`}
    </style>
  );
};
