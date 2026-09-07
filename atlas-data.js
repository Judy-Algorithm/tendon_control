export const ATLAS = {
  "joints": [
    {
      "id": "joint_bone0",
      "title": "腕关节",
      "part": "手腕",
      "location": "腕关节",
      "anchor": "flexion",
      "dofs": [
        {
          "id": "wrist_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": -68.7549381658962,
            "max": 68.7549381658962,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "ECRB",
                "FCR",
                "FCU",
                "PL",
                "FDS5",
                "FDS4",
                "FDS3",
                "FDS2",
                "FDP5",
                "FDP4",
                "FDP3",
                "FDP2",
                "EPB",
                "FPL",
                "APL"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "ECRL",
                "ECU",
                "EDC5",
                "EDC4",
                "EDC3",
                "EDC2",
                "EDM",
                "EIP",
                "EPL"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "ECRL": -3.3685803292722616,
            "ECRB": 2.81122325700011,
            "ECU": -5.500379125489822,
            "FCR": 12.167390057987934,
            "FCU": 10.78814441025455,
            "PL": 17.971097006720704,
            "FDS5": 10.131873449489005,
            "FDS4": 10.073188278177314,
            "FDS3": 10.750339248432207,
            "FDS2": 10.678356587784402,
            "FDP5": 7.86358225146946,
            "FDP4": 8.245154237902435,
            "FDP3": 8.475056824587917,
            "FDP2": 8.988301313945822,
            "EDC5": -8.18252785576788,
            "EDC4": -13.078785263343116,
            "EDC3": -11.170556390589393,
            "EDC2": -11.259072692068823,
            "EDM": -11.107804248294496,
            "EIP": -9.162813883495827,
            "EPL": -7.078005207853749,
            "EPB": 3.0136805014185417,
            "FPL": 9.68240222661001,
            "APL": 7.057485892676293
          }
        },
        {
          "id": "wrist_abd",
          "action": "桡偏／尺偏",
          "range": {
            "min": -28.64788975654116,
            "max": 34.377469071488946,
            "negativeLabel": "尺偏",
            "positiveLabel": "桡偏"
          },
          "directions": [
            {
              "id": "positive",
              "label": "桡偏",
              "tendons": [
                "ECRL",
                "FCR",
                "PL",
                "FDS3",
                "FDS2",
                "FDP4",
                "FDP3",
                "FDP2",
                "EDC3",
                "EDC2",
                "EIP",
                "EPL",
                "EPB",
                "FPL",
                "APL"
              ]
            },
            {
              "id": "negative",
              "label": "尺偏",
              "tendons": [
                "ECRB",
                "ECU",
                "FCU",
                "FDS5",
                "FDS4",
                "FDP5",
                "EDC5",
                "EDC4",
                "EDM"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "ECRL": 16.674140980253714,
            "ECRB": -14.569065911068362,
            "ECU": -9.780326828283163,
            "FCR": 7.732548071314035,
            "FCU": -9.097345004722113,
            "PL": 1.6242537777424506,
            "FDS5": -2.088901946085372,
            "FDS4": -0.9040546610694367,
            "FDS3": 3.064253230363075,
            "FDS2": 4.6128236792335455,
            "FDP5": -0.7769989559784883,
            "FDP4": 0.36455437735939333,
            "FDP3": 2.0739303218403493,
            "FDP2": 4.957275006564888,
            "EDC5": -6.28019739184004,
            "EDC4": -3.2822048209545556,
            "EDC3": 1.7997412134149056,
            "EDC2": 3.915137969459542,
            "EDM": -4.291504932383252,
            "EIP": 1.0274157197994018,
            "EPL": 17.21539843078949,
            "EPB": 23.089742494211794,
            "FPL": 12.67787621142,
            "APL": 21.549141553068463
          }
        }
      ],
      "tendons": [
        "ECRB",
        "FCR",
        "FCU",
        "PL",
        "FDS5",
        "FDS4",
        "FDS3",
        "FDS2",
        "FDP5",
        "FDP4",
        "FDP3",
        "FDP2",
        "EPB",
        "FPL",
        "APL",
        "ECRL",
        "ECU",
        "EDC5",
        "EDC4",
        "EDC3",
        "EDC2",
        "EDM",
        "EIP",
        "EPL"
      ]
    },
    {
      "id": "joint_bone1",
      "title": "拇指 CMC",
      "part": "拇指",
      "location": "腕掌关节 CMC",
      "anchor": "cmc_flexion",
      "dofs": [
        {
          "id": "thumb_CMC_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": -17.188734535744473,
            "max": 57.29577951308232,
            "negativeLabel": "弯曲",
            "positiveLabel": "伸展"
          },
          "directions": [
            {
              "id": "negative",
              "label": "弯曲",
              "tendons": [
                "FPL",
                "OP"
              ]
            },
            {
              "id": "positive",
              "label": "伸展",
              "tendons": [
                "EPL",
                "EPB",
                "APL"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "EPL": 0.015263733747001932,
            "EPB": 5.2083077015768255,
            "FPL": -7.661912880508666,
            "APL": 3.4974011614584066,
            "OP": -12.766612667764958
          }
        },
        {
          "id": "thumb_CMC_abd",
          "action": "外展／内收",
          "range": {
            "min": -40.10704497733785,
            "max": 80.21408994321654,
            "negativeLabel": "内收",
            "positiveLabel": "外展"
          },
          "directions": [
            {
              "id": "positive",
              "label": "外展",
              "tendons": [
                "FPL",
                "APL",
                "OP"
              ]
            },
            {
              "id": "negative",
              "label": "内收",
              "tendons": [
                "EPL",
                "EPB"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "EPL": -7.504732953542422,
            "EPB": -4.752576279939397,
            "FPL": 5.719232979121257,
            "APL": 4.56354876588271,
            "OP": 5.1755152590277875
          }
        }
      ],
      "tendons": [
        "FPL",
        "OP",
        "EPL",
        "EPB",
        "APL"
      ]
    },
    {
      "id": "joint_bone2",
      "title": "拇指 MCP",
      "part": "拇指",
      "location": "掌指关节 MCP",
      "anchor": "mp_flexion",
      "dofs": [
        {
          "id": "thumb_MCP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": -11.459156074503804,
            "max": 57.29577951308232,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FPL"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EPL",
                "EPB"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "EPL": -5.68986498928781,
            "EPB": -4.340090985130784,
            "FPL": 7.139824796938976
          }
        },
        {
          "id": "thumb_MCP_abd",
          "action": "外展／内收",
          "range": {
            "min": -17.188734535744473,
            "max": 17.188734535744473,
            "negativeLabel": "内收",
            "positiveLabel": "外展"
          },
          "directions": [
            {
              "id": "positive",
              "label": "外展",
              "tendons": [
                "EPL",
                "EPB",
                "FPL"
              ]
            },
            {
              "id": "negative",
              "label": "内收",
              "tendons": []
            }
          ],
          "neutralMomentArmsMm": {
            "EPL": 1.3642416114384601,
            "EPB": 0.7796207608183462,
            "FPL": 0.3433711989108788
          }
        }
      ],
      "tendons": [
        "FPL",
        "EPL",
        "EPB"
      ]
    },
    {
      "id": "joint_bone3",
      "title": "拇指 IP",
      "part": "拇指",
      "location": "指间关节 IP",
      "anchor": "ip_flexion",
      "dofs": [
        {
          "id": "thumb_IP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": -11.459156074503804,
            "max": 85.94366926962348,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FPL"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EPL"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "EPL": -3.09552681399117,
            "FPL": 5.292651517521336
          }
        }
      ],
      "tendons": [
        "FPL",
        "EPL"
      ]
    },
    {
      "id": "joint_bone6",
      "title": "食指 MCP",
      "part": "食指",
      "location": "掌指关节 MCP",
      "anchor": "mcp2_flexion",
      "dofs": [
        {
          "id": "index_MCP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": -20.053522485804134,
            "max": 91.67324859603043,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDS2",
                "FDP2",
                "RI2",
                "LU_RB2",
                "UI_UB2"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC2",
                "EIP"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS2": 8.595606215054863,
            "FDP2": 13.246153559990098,
            "EDC2": -8.710193741620131,
            "EIP": -9.001143428381692,
            "RI2": 4.318038050158693,
            "LU_RB2": 4.538451268518898,
            "UI_UB2": 3.2312252050543915
          }
        },
        {
          "id": "index_MCP_abd",
          "action": "外展／内收",
          "range": {
            "min": -17.188734535744473,
            "max": 22.91831214900761,
            "negativeLabel": "内收",
            "positiveLabel": "外展"
          },
          "directions": [
            {
              "id": "positive",
              "label": "外展",
              "tendons": [
                "EDC2",
                "EIP",
                "RI2",
                "LU_RB2"
              ]
            },
            {
              "id": "negative",
              "label": "内收",
              "tendons": [
                "FDS2",
                "FDP2",
                "UI_UB2"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS2": -0.11127311694833282,
            "FDP2": -1.7482569313264529,
            "EDC2": 0.8504701964705819,
            "EIP": 2.059731281392551,
            "RI2": 3.3535097112246484,
            "LU_RB2": 5.7322258789396985,
            "UI_UB2": -7.823658737852667
          }
        }
      ],
      "tendons": [
        "FDS2",
        "FDP2",
        "RI2",
        "LU_RB2",
        "UI_UB2",
        "EDC2",
        "EIP"
      ]
    },
    {
      "id": "joint_bone7",
      "title": "食指 PIP",
      "part": "食指",
      "location": "近侧指间关节 PIP",
      "anchor": "pm2_flexion",
      "dofs": [
        {
          "id": "index_PIP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": 0,
            "max": 103.13240037335076,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDS2",
                "FDP2"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC2",
                "EIP",
                "LU_RB2",
                "UI_UB2"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS2": 2.544398763135536,
            "FDP2": 4.4124203949682546,
            "EDC2": -3.9473321823994327,
            "EIP": -4.870233397881006,
            "LU_RB2": -1.4063315089153428,
            "UI_UB2": -3.3491624718601654
          }
        }
      ],
      "tendons": [
        "FDS2",
        "FDP2",
        "EDC2",
        "EIP",
        "LU_RB2",
        "UI_UB2"
      ]
    },
    {
      "id": "joint_bone8",
      "title": "食指 DIP",
      "part": "食指",
      "location": "远侧指间关节 DIP",
      "anchor": "md2_flexion",
      "dofs": [
        {
          "id": "index_DIP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": 0,
            "max": 91.67324859603043,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDP2"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC2",
                "EIP"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDP2": 2.203128826223574,
            "EDC2": -2.2718011642767477,
            "EIP": -1.8566371074443955
          }
        }
      ],
      "tendons": [
        "FDP2",
        "EDC2",
        "EIP"
      ]
    },
    {
      "id": "joint_bone11",
      "title": "中指 MCP",
      "part": "中指",
      "location": "掌指关节 MCP",
      "anchor": "mcp3_flexion",
      "dofs": [
        {
          "id": "middle_MCP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": -20.053522485804134,
            "max": 91.67324859603043,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDS3",
                "FDP3",
                "RI3",
                "LU_RB3",
                "UI_UB3"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC3"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS3": 9.344562388818396,
            "FDP3": 9.570493841207083,
            "EDC3": -12.27795012644914,
            "RI3": 3.5113223710831196,
            "LU_RB3": 4.088536633383115,
            "UI_UB3": 7.052455309125733
          }
        },
        {
          "id": "middle_MCP_abd",
          "action": "桡偏／尺偏",
          "range": {
            "min": -17.188734535744473,
            "max": 22.91831214900761,
            "negativeLabel": "尺偏",
            "positiveLabel": "桡偏"
          },
          "directions": [
            {
              "id": "positive",
              "label": "桡偏",
              "tendons": [
                "EDC3",
                "RI3",
                "LU_RB3"
              ]
            },
            {
              "id": "negative",
              "label": "尺偏",
              "tendons": [
                "FDS3",
                "FDP3",
                "UI_UB3"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS3": -1.5366376000242254,
            "FDP3": -0.7621576790430654,
            "EDC3": 1.198874550082724,
            "RI3": 6.053559998108795,
            "LU_RB3": 9.694764337496453,
            "UI_UB3": -6.374447389341702
          }
        }
      ],
      "tendons": [
        "FDS3",
        "FDP3",
        "RI3",
        "LU_RB3",
        "UI_UB3",
        "EDC3"
      ]
    },
    {
      "id": "joint_bone12",
      "title": "中指 PIP",
      "part": "中指",
      "location": "近侧指间关节 PIP",
      "anchor": "pm3_flexion",
      "dofs": [
        {
          "id": "middle_PIP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": 0,
            "max": 103.13240037335076,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDS3",
                "FDP3"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC3",
                "LU_RB3",
                "UI_UB3"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS3": 3.651316420567055,
            "FDP3": 5.187694897774137,
            "EDC3": -4.253164133628313,
            "LU_RB3": -0.49958100924083937,
            "UI_UB3": -1.4224164482037072
          }
        }
      ],
      "tendons": [
        "FDS3",
        "FDP3",
        "EDC3",
        "LU_RB3",
        "UI_UB3"
      ]
    },
    {
      "id": "joint_bone13",
      "title": "中指 DIP",
      "part": "中指",
      "location": "远侧指间关节 DIP",
      "anchor": "md3_flexion",
      "dofs": [
        {
          "id": "middle_DIP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": 0,
            "max": 91.67324859603043,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDP3"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC3"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDP3": 1.9087247689600673,
            "EDC3": -2.0302228934558206
          }
        }
      ],
      "tendons": [
        "FDP3",
        "EDC3"
      ]
    },
    {
      "id": "joint_bone16",
      "title": "无名指 MCP",
      "part": "无名指",
      "location": "掌指关节 MCP",
      "anchor": "mcp4_flexion",
      "dofs": [
        {
          "id": "ring_MCP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": -20.053522485804134,
            "max": 91.67324859603043,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDS4",
                "FDP4",
                "RI4",
                "LU_RB4",
                "UI_UB4"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC4"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS4": 7.442145333546486,
            "FDP4": 7.613554735260197,
            "EDC4": -8.136173960280074,
            "RI4": 2.906744464623759,
            "LU_RB4": 2.7591086471515234,
            "UI_UB4": 4.535819703704638
          }
        },
        {
          "id": "ring_MCP_abd",
          "action": "外展／内收",
          "range": {
            "min": -17.188734535744473,
            "max": 22.91831214900761,
            "negativeLabel": "外展",
            "positiveLabel": "内收"
          },
          "directions": [
            {
              "id": "negative",
              "label": "外展",
              "tendons": [
                "FDP4",
                "UI_UB4"
              ]
            },
            {
              "id": "positive",
              "label": "内收",
              "tendons": [
                "FDS4",
                "EDC4",
                "RI4",
                "LU_RB4"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS4": 1.8205725925946268,
            "FDP4": -0.5670313765031553,
            "EDC4": 1.7780871432496357,
            "RI4": 8.48368409840977,
            "LU_RB4": 5.522353739904998,
            "UI_UB4": -5.568543783033054
          }
        }
      ],
      "tendons": [
        "FDS4",
        "FDP4",
        "RI4",
        "LU_RB4",
        "UI_UB4",
        "EDC4"
      ]
    },
    {
      "id": "joint_bone17",
      "title": "无名指 PIP",
      "part": "无名指",
      "location": "近侧指间关节 PIP",
      "anchor": "pm4_flexion",
      "dofs": [
        {
          "id": "ring_PIP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": 0,
            "max": 103.13240037335076,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDS4",
                "FDP4"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC4",
                "LU_RB4",
                "UI_UB4"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS4": 2.1659216024063808,
            "FDP4": 5.827722096962135,
            "EDC4": -3.281790912270573,
            "LU_RB4": -0.8206712437884243,
            "UI_UB4": -1.8021388823154905
          }
        }
      ],
      "tendons": [
        "FDS4",
        "FDP4",
        "EDC4",
        "LU_RB4",
        "UI_UB4"
      ]
    },
    {
      "id": "joint_bone18",
      "title": "无名指 DIP",
      "part": "无名指",
      "location": "远侧指间关节 DIP",
      "anchor": "md4_flexion",
      "dofs": [
        {
          "id": "ring_DIP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": 0,
            "max": 91.67324859603043,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDP4"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC4"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDP4": 1.1597202074617796,
            "EDC4": -4.3882125089737185
          }
        }
      ],
      "tendons": [
        "FDP4",
        "EDC4"
      ]
    },
    {
      "id": "joint_bone21",
      "title": "小指 MCP",
      "part": "小指",
      "location": "掌指关节 MCP",
      "anchor": "mcp5_flexion",
      "dofs": [
        {
          "id": "pinky_MCP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": -28.64788975654116,
            "max": 91.67324859603043,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDS5",
                "FDP5",
                "RI5",
                "LU_RB5",
                "UI_UB5"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC5",
                "EDM"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS5": 7.56695776071185,
            "FDP5": 6.472018575753541,
            "EDC5": -7.237985279707707,
            "EDM": -5.952797844857885,
            "RI5": 5.072335352922962,
            "LU_RB5": 1.2229261194497525,
            "UI_UB5": 6.346216018959526
          }
        },
        {
          "id": "pinky_MCP_abd",
          "action": "外展／内收",
          "range": {
            "min": -17.188734535744473,
            "max": 28.64788975654116,
            "negativeLabel": "外展",
            "positiveLabel": "内收"
          },
          "directions": [
            {
              "id": "negative",
              "label": "外展",
              "tendons": [
                "FDS5",
                "EDM",
                "UI_UB5"
              ]
            },
            {
              "id": "positive",
              "label": "内收",
              "tendons": [
                "FDP5",
                "EDC5",
                "RI5",
                "LU_RB5"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS5": -1.1101696826997811,
            "FDP5": 0.09749989549037646,
            "EDC5": 3.0431671597780103,
            "EDM": -0.5471688017015374,
            "RI5": 3.9137990554544606,
            "LU_RB5": 7.674903265004444,
            "UI_UB5": -6.367526057493195
          }
        }
      ],
      "tendons": [
        "FDS5",
        "FDP5",
        "RI5",
        "LU_RB5",
        "UI_UB5",
        "EDC5",
        "EDM"
      ]
    },
    {
      "id": "joint_bone22",
      "title": "小指 PIP",
      "part": "小指",
      "location": "近侧指间关节 PIP",
      "anchor": "pm5_flexion",
      "dofs": [
        {
          "id": "pinky_PIP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": 0,
            "max": 103.13240037335076,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDS5",
                "FDP5"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC5",
                "EDM",
                "LU_RB5",
                "UI_UB5"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDS5": 1.939767358956082,
            "FDP5": 3.37617264611537,
            "EDC5": -3.7843767168410074,
            "EDM": -2.1958610997639583,
            "LU_RB5": -3.603198265154398,
            "UI_UB5": -1.2091807968404007
          }
        }
      ],
      "tendons": [
        "FDS5",
        "FDP5",
        "EDC5",
        "EDM",
        "LU_RB5",
        "UI_UB5"
      ]
    },
    {
      "id": "joint_bone23",
      "title": "小指 DIP",
      "part": "小指",
      "location": "远侧指间关节 DIP",
      "anchor": "md5_flexion",
      "dofs": [
        {
          "id": "pinky_DIP_flex",
          "action": "弯曲／伸展",
          "range": {
            "min": 0,
            "max": 91.67324859603043,
            "negativeLabel": "伸展",
            "positiveLabel": "弯曲"
          },
          "directions": [
            {
              "id": "positive",
              "label": "弯曲",
              "tendons": [
                "FDP5"
              ]
            },
            {
              "id": "negative",
              "label": "伸展",
              "tendons": [
                "EDC5",
                "EDM"
              ]
            }
          ],
          "neutralMomentArmsMm": {
            "FDP5": 1.4276688511431117,
            "EDC5": -1.9440452365416105,
            "EDM": -1.4822464052455713
          }
        }
      ],
      "tendons": [
        "FDP5",
        "EDC5",
        "EDM"
      ]
    }
  ],
  "tendons": [
    {
      "id": "ECRL",
      "name": "桡侧腕长伸肌",
      "modelIndex": 0
    },
    {
      "id": "ECRB",
      "name": "桡侧腕短伸肌",
      "modelIndex": 1
    },
    {
      "id": "ECU",
      "name": "尺侧腕伸肌",
      "modelIndex": 2
    },
    {
      "id": "FCR",
      "name": "桡侧腕屈肌",
      "modelIndex": 3
    },
    {
      "id": "FCU",
      "name": "尺侧腕屈肌",
      "modelIndex": 4
    },
    {
      "id": "PL",
      "name": "掌长肌",
      "modelIndex": 5
    },
    {
      "id": "FDS5",
      "name": "指浅屈肌 · 小指支",
      "modelIndex": 8
    },
    {
      "id": "FDS4",
      "name": "指浅屈肌 · 无名指支",
      "modelIndex": 9
    },
    {
      "id": "FDS3",
      "name": "指浅屈肌 · 中指支",
      "modelIndex": 10
    },
    {
      "id": "FDS2",
      "name": "指浅屈肌 · 食指支",
      "modelIndex": 11
    },
    {
      "id": "FDP5",
      "name": "指深屈肌 · 小指支",
      "modelIndex": 12
    },
    {
      "id": "FDP4",
      "name": "指深屈肌 · 无名指支",
      "modelIndex": 13
    },
    {
      "id": "FDP3",
      "name": "指深屈肌 · 中指支",
      "modelIndex": 14
    },
    {
      "id": "FDP2",
      "name": "指深屈肌 · 食指支",
      "modelIndex": 15
    },
    {
      "id": "EDC5",
      "name": "指总伸肌 · 小指支",
      "modelIndex": 16
    },
    {
      "id": "EDC4",
      "name": "指总伸肌 · 无名指支",
      "modelIndex": 17
    },
    {
      "id": "EDC3",
      "name": "指总伸肌 · 中指支",
      "modelIndex": 18
    },
    {
      "id": "EDC2",
      "name": "指总伸肌 · 食指支",
      "modelIndex": 19
    },
    {
      "id": "EDM",
      "name": "小指伸肌",
      "modelIndex": 20
    },
    {
      "id": "EIP",
      "name": "示指固有伸肌",
      "modelIndex": 21
    },
    {
      "id": "EPL",
      "name": "拇长伸肌",
      "modelIndex": 22
    },
    {
      "id": "EPB",
      "name": "拇短伸肌",
      "modelIndex": 23
    },
    {
      "id": "FPL",
      "name": "拇长屈肌",
      "modelIndex": 24
    },
    {
      "id": "APL",
      "name": "拇长展肌",
      "modelIndex": 25
    },
    {
      "id": "OP",
      "name": "拇对掌肌",
      "modelIndex": 26
    },
    {
      "id": "RI2",
      "name": "食指桡侧骨间肌等效通路",
      "modelIndex": 27
    },
    {
      "id": "LU_RB2",
      "name": "食指蚓状肌—桡侧腱膜通路",
      "modelIndex": 28
    },
    {
      "id": "UI_UB2",
      "name": "食指尺侧骨间肌—尺侧腱膜通路",
      "modelIndex": 29
    },
    {
      "id": "RI3",
      "name": "中指桡侧骨间肌等效通路",
      "modelIndex": 30
    },
    {
      "id": "LU_RB3",
      "name": "中指蚓状肌—桡侧腱膜通路",
      "modelIndex": 31
    },
    {
      "id": "UI_UB3",
      "name": "中指尺侧骨间肌—尺侧腱膜通路",
      "modelIndex": 32
    },
    {
      "id": "RI4",
      "name": "无名指桡侧骨间肌等效通路",
      "modelIndex": 33
    },
    {
      "id": "LU_RB4",
      "name": "无名指蚓状肌—桡侧腱膜通路",
      "modelIndex": 34
    },
    {
      "id": "UI_UB4",
      "name": "无名指尺侧骨间肌—尺侧腱膜通路",
      "modelIndex": 35
    },
    {
      "id": "RI5",
      "name": "小指桡侧骨间肌等效通路",
      "modelIndex": 36
    },
    {
      "id": "LU_RB5",
      "name": "小指蚓状肌—桡侧腱膜通路",
      "modelIndex": 37
    },
    {
      "id": "UI_UB5",
      "name": "小指尺侧骨间肌—尺侧腱膜通路",
      "modelIndex": 38
    }
  ]
};
