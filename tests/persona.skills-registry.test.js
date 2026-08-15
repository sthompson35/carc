'use strict';
module.exports = {
 modules:['persona/skills-registry.js'],
 run:function(ctx,assert){
   var s={skillId:'S1',name:'Test',category:'TEST',proficiencyTarget:'WORKING',status:'ASSIGNED',sourceRecordId:'SRC',evidence:[],assessmentId:null,verifier:null,verifiedAt:null,reviewDueAt:null};
   assert(ctx.skillSatisfiesMission(s)===false,'ASSIGNED skill does not satisfy mission');
   var threw=false; try{ctx.verifySkillRecord(s,{verifier:'@HELIX',evidence:[{id:'E'}]});}catch(e){threw=/ASSESSMENT/.test(e.message);}
   assert(threw,'verification rejects missing assessmentId');
   var v=ctx.verifySkillRecord(s,{assessmentId:'A1',verifier:'@HELIX',evidence:[{id:'E'}]});
   assert(v.status==='VERIFIED' && ctx.skillSatisfiesMission(v)===true,'evidence+assessment+verifier can produce valid VERIFIED skill');
 }
};
