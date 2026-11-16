// Generated from WSY_left_radioulnar_ECU_EDM_fixed_REVIEW.osim.
// Ranges are converted from radians to degrees; moment arms are at the model default pose.
export const WSY_MODEL_SOURCE=Object.freeze({
  name:'WSY_20261111_left_personalized_REVIEW',
  file:'WSY_left_radioulnar_ECU_EDM_fixed_REVIEW.osim',
  sha256:'fe5b786c2e2e96228e2b07b56e71b0de20d85a4caeda017f213dd638cbf2791e',
  muscleCount:43,bodyCount:31,jointCount:31,coordinateCount:34,
});

const flex=(coordinate,min,max)=>({coordinate,min,max,negativeLabel:'伸展',positiveLabel:'屈曲'});
const abd=(coordinate,negativeLabel='内收',positiveLabel='外展')=>({coordinate,min:-15,max:15,negativeLabel,positiveLabel});
export const WSY_COORDINATES=Object.freeze({
  forearm_rotation:{coordinate:'forearm_rotation',min:-143.239449,max:143.239449,negativeLabel:'负方向',positiveLabel:'正方向'},
  wrist_flex:flex('flexion',-70,70),
  wrist_abd:{coordinate:'deviation',min:-10,max:25,negativeLabel:'桡偏',positiveLabel:'尺偏'},
  thumb_CMC_flex:flex('cmc_flexion',-45,30),
  thumb_CMC_abd:{coordinate:'cmc_abduction',min:-30,max:45,negativeLabel:'内收',positiveLabel:'外展'},
  thumb_MCP_flex:flex('mp_flexion',-40,45),
  thumb_IP_flex:flex('ip_flexion',-25,75),
  ulnar_CMC_flex:{coordinate:'4cmc_flexion / CMC5_r1',min:0,max:11.642029,negativeLabel:'伸回中立位',positiveLabel:'屈曲'},
  index_MCP_flex:flex('2mcp_flexion',-45,90),index_MCP_abd:abd('2mcp_abduction'),
  middle_MCP_flex:flex('3mcp_flexion',-45,90),middle_MCP_abd:abd('3mcp_abduction','尺偏','桡偏'),
  ring_MCP_flex:flex('4mcp_flexion',-45,90),ring_MCP_abd:abd('4mcp_abduction','外展','内收'),
  pinky_MCP_flex:flex('5mcp_flexion',-45,90),pinky_MCP_abd:abd('5mcp_abduction','外展','内收'),
  index_PIP_flex:flex('2pm_flexion',0,100),middle_PIP_flex:flex('3pm_flexion',0,100),ring_PIP_flex:flex('4pm_flexion',0,100),pinky_PIP_flex:flex('5pm_flexion',0,100),
  index_DIP_flex:flex('2md_flexion',0,80),middle_DIP_flex:flex('3md_flexion',0,80),ring_DIP_flex:flex('4md_flexion',0,80),pinky_DIP_flex:flex('5md_flexion',0,80),
});

export const WSY_JOINT_NAMES=Object.freeze({
  joint_forearm_rotation:'radioulnar',joint_bone0:'radiocarpal',joint_bone1:'CMC1a / CMC1b',
  joint_bone2:'MCP',joint_bone3:'IP',joint_ulnar_cmc:'CMC4 / CMC5',
  joint_bone6:'_2MCP',joint_bone7:'_2prox-midph_b',joint_bone8:'_2mid-distph',
  joint_bone11:'_3MCP',joint_bone12:'_3prox-midph_b',joint_bone13:'_3mid-distph',
  joint_bone16:'_4MCP',joint_bone17:'_4prox-midph_b',joint_bone18:'_4mid-distph',
  joint_bone21:'_5MCP',joint_bone22:'_5prox-midph_b',joint_bone23:'_5mid-distph',
});

export const WSY_MOMENT_ARMS_MM=Object.freeze({
  forearm_rotation:{ECRL:-2.116304,ECRB:-.682313,ECU:-.563126,FCR:2.070092,FCU:.719268,PL:2.803896,FDSL:1.702385,FDSR:2.114703,FDSM:2.606286,FDSI:2.824564,FDPL:1.688647,FDPR:1.80198,FDPM:2.19974,FDPI:2.33346,EDCL:-1.187349,EDCR:-1.575601,EDCM:-1.434127,EDCI:-1.24192,EDM:-.64366,EIP:-.178255,EPL:-1.520228},
  deviation:{ECRL:-25.535439,ECRB:-18.0308,ECU:29.582717,FCR:-8.493663,FCU:30.564058,PL:.299746,FDSL:10.408132,FDSR:8.375684,FDSM:.427014,FDSI:-1.935613,FDPL:7.895869,FDPR:5.703985,FDPM:2.658969,FDPI:-2.835365,EDCL:7.691269,EDCR:4.569552,EDCM:-2.915813,EDCI:-10.762562,EDM:11.2306,EIP:-8.568352,EPL:-14.010604,EPB:-23.221083,FPL:-6.53649,APL:-24.584413},
  flexion:{ECRL:-12.255146,ECRB:-16.609441,ECU:-6.217452,FCR:19.230254,FCU:18.602306,PL:24.795967,FDSL:18.443825,FDSR:18.13123,FDSM:18.01162,FDSI:17.521157,FDPL:14.811156,FDPR:15.000758,FDPM:14.806315,FDPI:15.021011,EDCL:-16.221456,EDCR:-20.119563,EDCM:-19.73037,EDCI:-18.958459,EDM:-13.108252,EIP:-17.066025,EPL:-7.597735,EPB:3.145088,FPL:24.463469,APL:15.780746},
  cmc_flexion:{EPL:-11.630198,EPB:-19.89853,FPL:18.733342,APL:1.583157,APB:-5.17097,FPB:8.024367,OPP:5.518804,ADPt:4.67879,ADPo:3.713976,'1stDI_MC1':8.412459},
  cmc_abduction:{EPL:-11.911044,EPB:4.199051,FPL:-.038466,APL:8.778924,APB:7.912323,FPB:-2.226015,OPP:1.529959,ADPt:-10.255674,ADPo:-7.341444,'1stDI_MC1':-4.514108},
  mp_flexion:{EPL:-7.804927,EPB:-6.970205,FPL:11.47311,APB:-2.706966,FPB:4.712571,ADPt:6.810923,ADPo:6.793838},
  ip_flexion:{EPL:-4.097881,FPL:7.322422},
  '4cmc_flexion':{FDSL:25.88892,FDSR:2.320221,FDPL:2.415379,FDPR:1.076428,EDCL:-34.069407,EDCR:-9.846452,EDM:-5.101337,'2ndPI':-4.255002,LUML:4.369012,LUMR:7.658726},
  '2mcp_abduction':{FDSI:-1.467949,FDPI:-.513131,EDCI:.200783,EIP:-1.309135,'1stPI':-6.18897,'1stDI_MC1':7.843142,'1stDI_MC2':7.258642,LUMI:4.194132},
  '2mcp_flexion':{FDSI:6.899706,FDPI:5.747076,EDCI:-10.567011,EIP:-10.475543,'1stPI':1.516604,'1stDI_MC1':2.634553,'1stDI_MC2':4.071138,LUMI:6.388365},
  '2pm_flexion':{FDSI:5.686135,FDPI:5.293488,EDCI:-4.09138,EIP:-4.037357},'2md_flexion':{FDPI:2.734361,EDCI:-3.793193,EIP:-3.69817},
  '3mcp_abduction':{FDSM:.17405,FDPM:.467391,EDCM:-.932049,'2ndDI':7.050434,'3rdDI':-6.879546,LUMM:5.382848},
  '3mcp_flexion':{FDSM:8.187102,FDPM:10.202527,EDCM:-10.202748,'2ndDI':.50349,'3rdDI':1.096902,LUMM:5.509672},
  '3pm_flexion':{FDSM:4.901159,FDPM:4.410041,EDCM:-3.637438},'3md_flexion':{FDPM:3.62577,EDCM:-2.596668},
  '4mcp_abduction':{FDSR:-.097142,FDPR:-.625004,EDCR:1.873845,'2ndPI':5.990503,'4thDI':-5.613256,LUMR:3.391179},
  '4mcp_flexion':{FDSR:7.385289,FDPR:7.351323,EDCR:-7.365829,'2ndPI':3.655275,'4thDI':.861534,LUMR:6.383318},
  '4pm_flexion':{FDSR:2.213034,FDPR:3.391168,EDCR:-2.806524},'4md_flexion':{FDPR:2.712011,EDCR:-3.120539},
  '5mcp_abduction':{FDSL:-1.399914,FDPL:-1.526072,EDCL:.820613,EDM:-.137546,ADM:-4.066677,FDM:-4.066677,'3rdPI':6.322215,LUML:3.320463},
  '5mcp_flexion':{FDSL:5.464757,FDPL:4.216223,EDCL:-5.754118,EDM:-5.487782,ADM:4.249486,FDM:4.249486,'3rdPI':2.495769,LUML:7.095613},
  '5pm_flexion':{FDSL:3.324786,FDPL:3.853997,EDCL:-3.223738,EDM:-3.221608},'5md_flexion':{FDPL:2.904338,EDCL:-1.994927,EDM:-2.020989},
});

export const WSY_BODY_FOR_VISUAL_BONE=Object.freeze({
  ulna:'ulna',radius:'radius',lunate:'proximal_row',scaphoid:'proximal_row',pisiform:'proximal_row',triquetrum:'proximal_row',
  capitate:'capitate',trapezium:'trapezium',trapezoid:'trapezoid',hamate:'hamate','1mc':'firstmc',thumbprox:'proximal_thumb',thumbdist:'distal_thumb',
  '2mc':'secondmc','3mc':'thirdmc','4mc':'fourthmc','5mc':'fifthmc',
  '2proxph':'2proxph','2midph':'2midph','2distph':'2distph','3proxph':'3proxph','3midph':'3midph','3distph':'3distph',
  '4proxph':'4proxph','4midph':'4midph','4distph':'4distph','5proxph':'5proxph','5midph':'5midph','5distph':'5distph',
});
