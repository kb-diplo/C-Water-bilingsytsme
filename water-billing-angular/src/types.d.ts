// Type declarations for modules without TypeScript definitions

declare module 'sweetalert2' {
  const Swal: any;
  export default Swal;
}

declare module 'chart.js' {
  export class Chart {
    constructor(ctx: any, config: any);
    static register(...items: any[]): void;
  }
  export const CategoryScale: any;
  export const LinearScale: any;
  export const BarElement: any;
  export const LineElement: any;
  export const PointElement: any;
  export const Title: any;
  export const Tooltip: any;
  export const Legend: any;
  export const Filler: any;
  export const registerables: any[];
}
