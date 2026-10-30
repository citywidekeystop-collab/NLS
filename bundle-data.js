(function(root){
  'use strict';
  const hd=(id)=>'https://www.homedepot.com/p/'+id;
  const img=(id,name)=>'https://images.thdstatic.com/productImages/'+id+'/svn/'+name+'-64_600.jpg';
  const styles=[
    {id:'kwikset-cove',brand:'Kwikset',style:'Cove',description:'Classic rounded entry knobs paired with single-cylinder deadbolts featuring SmartKey rekeying.',variants:[
      {id:'sn',finish:'Satin Nickel',model:'T242CV15SMTCPCO',source:hd('317193504'),pairs:2,basePriceCents:12394,image:img('9e488b67-e2a0-4881-ad05-a220af61ae4f','kwikset-door-lock-combo-packs-t242cv15smtcpco')},
      {id:'vb',finish:'Venetian Bronze',model:'T242CV11PSMTCPC',source:hd('317193503'),pairs:2,basePriceCents:11994,image:img('c4c8c144-2d03-4e1b-ad18-39ada39fd353','kwikset-door-lock-combo-packs-t242cv11psmtcpc')}
    ]},
    {id:'kwikset-polo',brand:'Kwikset',style:'Polo',description:'Traditional ball-style keyed entry knobs with matching single-cylinder deadbolts. This option uses conventional keyed cylinders.',variants:[
      {id:'vb',finish:'Venetian Bronze',model:'690P 11P CP',source:hd('100669043'),pairs:1,basePriceCents:6512,image:img('c469abc0-f3d4-480c-9d62-2f9d62c91b5f','kwikset-door-lock-combo-packs-690p-11p-cp')}
    ]},
    {id:'kwikset-juno',brand:'Kwikset',style:'Juno',description:'Mushroom-style entry knobs and single-cylinder deadbolts featuring SmartKey Security.',variants:[
      {id:'vb',finish:'Venetian Bronze',model:'991J 11P SMT CP',source:hd('100597325'),pairs:1,basePriceCents:12794,image:img('97ec498a-fecf-4a64-bc91-c301bd178600','kwikset-door-lock-combo-packs-991j-11p-smt-cp')}
    ]},
    {id:'defiant-brandywine',brand:'Defiant',style:'Brandywine',description:'Residential keyed entry knobs with matching single-cylinder deadbolts. Stainless Steel and Polished Brass are distinct finishes.',variants:[
      {id:'ss',finish:'Stainless Steel',model:'32B86D1BD',source:hd('323700794'),pairs:2,basePriceCents:4976,image:img('c9c53037-fa24-4f1f-b54a-f78b2b73eae7','defiant-door-lock-combo-packs-32b86d1bd')},
      {id:'pb',finish:'Polished Brass',model:'32B87D1BD',source:hd('323700680'),pairs:2,basePriceCents:7394,image:img('5c0d4f41-6def-4d74-b7db-f7db9877bbb7','defiant-door-lock-combo-packs-32b87d1bd')}
    ]},
    {id:'defiant-hartford',brand:'Defiant',style:'Hartford',description:'Traditional keyed entry knobs with matching single-cylinder deadbolts in Aged Bronze.',variants:[
      {id:'ab',finish:'Aged Bronze',model:'32BGX7D1BD',source:hd('323700875'),pairs:2,basePriceCents:11194,image:img('ecba5643-8189-4327-82d2-8e90da300e35','defiant-door-lock-combo-packs-32bgx7d1bd')}
    ]},
    {id:'schlage-georgian',brand:'Schlage',style:'Georgian',description:'Traditional Georgian entry knobs with matching single-cylinder deadbolts in Aged Bronze.',variants:[
      {id:'ab',finish:'Aged Bronze',model:'FB50N V GEO 716',source:hd('202958591'),pairs:1,basePriceCents:9994,image:img('c1a56b6a-ec04-45d3-bb8a-0429e71e3d05','schlage-door-lock-combo-packs-fb50n-v-geo-716')}
    ]},
    {id:'homefront-jannell',brand:'Home Front by Schlage',style:'Jannell',description:'Jannell keyed entry knobs paired with single-cylinder deadbolts in Aged Bronze.',variants:[
      {id:'ab',finish:'Aged Bronze',model:'UC60 V JNL 716',source:'https://www.lowes.com/pd/Home-Front-by-Schlage-Single-Cylinder-Deadbolt-and-Keyed-Entry-Jannell-Knob-in-Aged-Bronze/5001895055',pairs:1,basePriceCents:7396,extraKnobPriceCents:3996,image:'https://mobileimages.lowes.com/productimages/ca4570e2-f8e6-4c5a-a71f-4728259a0dbb/43278776.jpg'}
    ]},
    {id:'reliabilt-gallo',brand:'RELIABILT',style:'Gallo',description:'Gallo entry knobs and single-cylinder deadbolts in Antique Brass. Antique Brass has a darker tone than Polished Brass.',variants:[
      {id:'antb',finish:'Antique Brass',model:'93680-026',source:'https://www.lowes.com/pd/ReliaBilt-ReliaBilt-Gallo-Keyed-Entry-Knob-and-Single-Cylinder-Deadbolt-Project-Pack-in-Antique-Brass/5001914073',pairs:2,basePriceCents:8196,image:'https://mobileimages.lowes.com/productimages/2af5ec5f-2cca-4187-80f6-2e2729c4ba61/83607617.jpeg'}
    ]}
  ];
  const sizes=[{id:'1k1d',knobs:1,deadbolts:1,label:'1 Knob + 1 Deadbolt'}, {id:'2k2d',knobs:2,deadbolts:2,label:'2 Knobs + 2 Deadbolts'}, {id:'3k2d',knobs:3,deadbolts:2,label:'3 Knobs + 2 Deadbolts'}, {id:'4k4d',knobs:4,deadbolts:4,label:'4 Knobs + 4 Deadbolts'}];
  const keyings=[{id:'alike',label:'Keyed Alike — one key opens every lock'}, {id:'different',label:'Keyed Different — each lock has its own key'}];
  function price(variant,size){
    if(size.knobs===size.deadbolts)return Math.round(variant.basePriceCents*size.knobs/variant.pairs);
    if(size.id==='3k2d')return Math.round(variant.basePriceCents*2/variant.pairs)+(variant.extraKnobPriceCents||({'kwikset':3399,'defiant':2999,'schlage':5899,'reliabilt':2999}[variant.priceTier]||4999));
    return null;
  }
  function sku(style,variant,size,keying){return 'NLS-BDL-'+style.id.toUpperCase()+'-'+variant.id.toUpperCase()+'-'+size.id.toUpperCase()+'-'+keying.id.toUpperCase();}
  styles.forEach(style=>style.variants.forEach(variant=>{variant.priceTier=style.id.split('-')[0];}));
  for(const [kind,handleName,handleModel,handleImage,basePriceCents] of [
    ['knob','Polo Passage Knob','92001-556',img('06c421fc-0383-498e-b0f2-ade3966425ba','kwikset-passage-door-knobs-92001-556'),16102],
    ['lever','Balboa Passage Lever','200BL15CPV1',img('93e68225-afa8-4fd7-88a9-35fcc86db4c1','kwikset-passage-door-handles-200bl15cpv1'),18288]
  ])styles.push({id:'kwikset-keypad-'+kind,group:'keypad',brand:'Kwikset',style:'Powerbolt 250 + '+handleName,description:'Code entry with a Powerbolt 250 electronic deadbolt and a non-locking '+kind+'. Satin Nickel. No Wi-Fi or app required. Confirm door preparation and application before ordering.',sizes:[{id:'1k1d',knobs:1,deadbolts:1,label:'1 Keypad Deadbolt + 1 Passage '+(kind==='knob'?'Knob':'Lever')},{id:'2k2d',knobs:2,deadbolts:2,label:'2 Keypad Deadbolts + 2 Passage '+(kind==='knob'?'Knobs':'Levers')}],keyings:[{id:'alike',label:'Backup keys alike — one key for the deadbolts'},{id:'different',label:'Backup keys different — separate key per deadbolt'}],variants:[{id:'sn',finish:'Satin Nickel',model:'9250TRS15SMTRBP + '+handleModel,source:hd('324758942'),pairs:1,basePriceCents,image:img('524a3891-eabc-48cf-b69a-6bfb1ebd0bc4','kwikset-electronic-deadbolts-9250trs15smtrbp'),secondaryImage:handleImage}]});
  styles.forEach(style=>style.variants.forEach(variant=>{if(variant.image){variant.imageSource=variant.image;variant.image='/nls-bundle-'+style.id+'-'+variant.id+'.jpg';}if(variant.secondaryImage){variant.secondaryImageSource=variant.secondaryImage;variant.secondaryImage='/nls-bundle-'+style.id+'-'+variant.id+'-handle.jpg';}}));
  const api={styles,sizes,keyings,price,sku};
  if(typeof module!=='undefined')module.exports=api;
  else root.NLSBundles=api;
})(typeof window!=='undefined'?window:globalThis);
