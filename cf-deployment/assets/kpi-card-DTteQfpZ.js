import{c as a,W as p,X as f,j as s,C as j,f as y,s as d}from"./index-BAC0DUbF.js";/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=a("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=a("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=a("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);function k({title:m,value:e,previousValue:t,format:r="number",currency:l="ZAR",icon:o,className:x,onClick:h}){const n=t?(e-t)/t*100:0,i=n>0,c=n===0,u=r==="currency"?p(e,l):r==="percent"?`${e.toFixed(1)}%`:f(e);return s.jsx(j,{className:d("cursor-pointer transition-shadow hover:shadow-md",x),onClick:h,children:s.jsxs(y,{className:"p-4",children:[s.jsxs("div",{className:"flex items-center justify-between",children:[s.jsx("p",{className:"text-sm text-muted-foreground",children:m}),o&&s.jsx("div",{className:"text-muted-foreground",children:o})]}),s.jsxs("div",{className:"mt-2 flex items-baseline gap-2",children:[s.jsx("p",{className:"text-2xl font-bold font-mono tabular-nums",children:u}),t!==void 0&&s.jsxs("span",{className:d("flex items-center text-xs font-medium",i?"text-success":c?"text-muted-foreground":"text-destructive"),children:[i?s.jsx(g,{className:"mr-0.5 h-3 w-3"}):c?s.jsx(N,{className:"mr-0.5 h-3 w-3"}):s.jsx(w,{className:"mr-0.5 h-3 w-3"}),Math.abs(n).toFixed(1),"%"]})]})]})})}export{k as K,g as T,w as a};
