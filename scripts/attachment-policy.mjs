// Bone/region review, not subject-specific attachment-footprint measurements.
export const SOURCES = {
  upperLimb:'https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/',
  opponens:'https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-upper-limb/opponens-pollicis-muscle/19520',
};
const base=[0,.35],shaft=[.2,.8];
const end=(bone,region=base)=>({end:{bone,region,preserveSide:true}});
export const POLICY={
  ECRL:end('2mc'),ECRB:end('3mc'),ECU:end('5mc'),FCR:end('2mc'),
  // Retain MyoHand's distal FCU extension to MC5; do not erase the pisiform route.
  FCU:{...end('5mc'),note:'Modelled distal extension; pisiform/hamate attachments are not reconstructed.'},
  EPL:end('thumbdist'),EPB:end('thumbprox'),FPL:end('thumbdist'),APL:end('1mc'),
  OP:{start:{bone:'trapezium',region:[0,1],preserveSide:false},end:{bone:'1mc',region:shaft,preserveSide:true},
    note:'Bony-origin approximation near original palmar site; retinaculum and exact tubercle footprint are not segmented.'},
};
for(const d of [2,3,4,5]){
  POLICY['FDS'+d]=end(d+'midph',[.2,.7]);
  POLICY['FDP'+d]=end(d+'distph');
  POLICY['EDC'+d]={...end(d+'distph'),note:'Terminal extensor branch only; extensor expansion retained as an equivalent path.'};
}
POLICY.EDM={...end('5distph'),note:'Terminal extensor branch, not direct whole-muscle insertion.'};
POLICY.EIP={...end('2distph'),note:'Terminal extensor branch, not direct whole-muscle insertion.'};
export function preservationReason(id){
  if(id==='PL')return 'Palmar aponeurosis attachment: no matching soft-tissue mesh; retain source route.';
  if(/^(RI|LU_RB|UI_UB)/.test(id))return 'Functional intrinsic/expansion route, not a one-to-one anatomical muscle; no unsupported bone snapping.';
  return 'Proximal muscle/forearm path retained; full origin or muscle belly is not reconstructed.';
}
