import { forwardRef } from "react";

export const Starfield2D = forwardRef<HTMLCanvasElement>(
  function Starfield2D(_, ref) {
    return (
      <canvas
        aria-hidden="true"
        className="site-starfield"
        data-star-layers="far mid near"
        data-testid="starfield-2d"
        ref={ref}
      />
    );
  },
);
