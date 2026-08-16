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

   var empty=ctx.evaluateSkillsState({skills:[]});
   assert(empty.total===0 && empty.verified===0 && empty.percent===0,'evaluateSkillsState handles a participant with no skills');
   var mixed=ctx.evaluateSkillsState({skills:[s,v]});
   assert(mixed.total===2 && mixed.verified===1 && mixed.percent===50,'evaluateSkillsState counts VERIFIED among total skills');
   var undef=ctx.evaluateSkillsState({});
   assert(undef.total===0 && Array.isArray(undef.skills),'evaluateSkillsState tolerates a participant with no skills array at all');
 }
};
