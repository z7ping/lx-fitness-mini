/**
 * 训练相关的 prompt 模板
 */

// 分析用户需求的 prompt 模板
export const analyzeUserNeedsPrompt = (userInfo) => `作为一位专业的健身教练，请分析以下用户的训练需求：

用户信息：
- 性别：${userInfo.gender === 1 ? '男' : '女'}
- 年龄：${userInfo.age}岁
- 身高：${userInfo.height}cm
- 体重：${userInfo.weight}kg
- 目标：${userInfo.goal === 'lose' ? '减重' : userInfo.goal === 'gain' ? '增肌' : '保持体型'}
- 训练水平：${userInfo.level === 'beginner' ? '初级' : userInfo.level === 'intermediate' ? '中级' : '高级'}

请从以下几个方面进行分析：
1. 用户当前的身体状况评估
2. 训练目标的可实现性分析
3. 需要注意的健康风险
4. 建议的训练重点

请用专业但易懂的语言回答。`;

// 生成训练计划的 prompt 模板
export const generateTrainingPlanPrompt = (userInfo) => `基于之前的分析，请为这位用户制定一个周训练计划：

用户信息：
- 性别：${userInfo.gender === 1 ? '男' : '女'}
- 年龄：${userInfo.age}岁
- 身高：${userInfo.height}cm
- 体重：${userInfo.weight}kg
- 目标：${userInfo.goal === 'lose' ? '减重' : userInfo.goal === 'gain' ? '增肌' : '保持体型'}
- 训练水平：${userInfo.level === 'beginner' ? '初级' : userInfo.level === 'intermediate' ? '中级' : '高级'}

请按照以下JSON格式输出周训练计划，这个格式将直接用于应用程序的渲染：

\`\`\`json
{
  "week": 1,
  "weekRange": "2024年3月25日-2024年3月31日",
  "days": [
    {
      "day": "周一",
      "plans": [
        {
          "timeSlot": "早晨",
          "exercises": [
            {
              "name": "哑铃卧推",
              "sets": "3",
              "reps": "12",
              "weight": "适中",
              "duration": "15",
              "type": "胸部",
              "completed": false
            }
          ]
        }
      ]
    },
    {
      "day": "周二",
      "plans": []
    },
    // 其他日期...
  ]
}
\`\`\`

请确保：
1. 每周安排4-5天训练，合理安排休息日
2. 根据用户训练水平安排适当的训练动作、组数和次数
3. 训练计划应包含合理的训练时间段（早晨、上午、下午、晚上）
4. 每个训练动作应包含名称、组数、次数、重量建议、预计时长和训练部位
5. 所有日期（周一至周日）都必须包含在计划中，即使是休息日

请只返回JSON格式的训练计划，不要包含其他解释性文字。`;

// 生成饮食建议的 prompt 模板
export const generateDietPlanPrompt = (userInfo) => `请为这位用户制定一周的饮食计划：

用户信息：
- 性别：${userInfo.gender === 1 ? '男' : '女'}
- 年龄：${userInfo.age}岁
- 身高：${userInfo.height}cm
- 体重：${userInfo.weight}kg
- 目标：${userInfo.goal === 'lose' ? '减重' : userInfo.goal === 'gain' ? '增肌' : '保持体型'}
- 训练水平：${userInfo.level === 'beginner' ? '初级' : userInfo.level === 'intermediate' ? '中级' : '高级'}

请按照以下JSON格式输出周饮食计划，这个格式将直接用于应用程序的渲染：

\`\`\`json
{
  "week": 1,
  "weekRange": "2024年3月25日-2024年3月31日",
  "days": [
    {
      "day": "周一",
      "diet": {
        "breakfast": {
          "content": "全麦面包2片，煎蛋1个，牛奶200ml，香蕉1根",
          "calories": "约450大卡",
          "protein": "20g",
          "carbs": "60g",
          "fat": "15g"
        },
        "lunch": {
          "content": "糙米饭1碗，清蒸鸡胸肉100g，西兰花100g，胡萝卜50g",
          "calories": "约500大卡",
          "protein": "30g",
          "carbs": "70g",
          "fat": "10g"
        },
        "dinner": {
          "content": "燕麦粥1碗，水煮鱼100g，菠菜100g，豆腐50g",
          "calories": "约400大卡",
          "protein": "25g",
          "carbs": "50g",
          "fat": "10g"
        },
        "snacks": {
          "content": "苹果1个，无糖酸奶1杯，混合坚果30g",
          "calories": "约300大卡",
          "protein": "10g",
          "carbs": "30g",
          "fat": "15g"
        }
      }
    },
    {
      "day": "周二",
      "diet": {
        "breakfast": { "content": "..." },
        "lunch": { "content": "..." },
        "dinner": { "content": "..." },
        "snacks": { "content": "..." }
      }
    },
    // 其他日期...
  ],
  "dailyNutrition": {
    "calories": "约1800-2200大卡",
    "protein": "120-150g",
    "carbs": "200-250g",
    "fat": "50-70g"
  },
  "notes": "饮食建议和注意事项..."
}
\`\`\`

请确保：
1. 饮食计划符合用户的训练目标和身体状况
2. 每天的饮食包含早餐、午餐、晚餐和加餐
3. 每餐都包含主要食材和大致的营养成分
4. 所有日期（周一至周日）都必须包含在计划中
5. 提供每日总体营养摄入建议和注意事项

请只返回JSON格式的饮食计划，不要包含其他解释性文字。`;

// 生成综合计划的prompt模板
export const generateCombinedPlanPrompt = (userInfo) => `请为这位用户制定一个完整的周健身计划，包括训练计划和饮食计划：

用户信息：
- 性别：${userInfo.gender === 1 ? '男' : '女'}
- 年龄：${userInfo.age}岁
- 身高：${userInfo.height}cm
- 体重：${userInfo.weight}kg
- 目标：${userInfo.goal === 'lose' ? '减重' : userInfo.goal === 'gain' ? '增肌' : '保持体型'}
- 训练水平：${userInfo.level === 'beginner' ? '初级' : userInfo.level === 'intermediate' ? '中级' : '高级'}

请按照以下JSON格式输出完整的周计划，这个格式将直接用于应用程序的渲染：

\`\`\`json
{
  "weeklyPlan": {
    "week": 1,
    "weekRange": "2024年3月25日-2024年3月31日",
    "days": [
      {
        "day": "周一",
        "plans": [
          {
            "timeSlot": "早晨",
            "exercises": [
              {
                "name": "哑铃卧推",
                "sets": "3",
                "reps": "12",
                "weight": "适中",
                "duration": "15",
                "type": "胸部",
                "completed": false
              }
            ]
          }
        ],
        "diet": {
          "breakfast": {
            "content": "全麦面包2片，煎蛋1个，牛奶200ml，香蕉1根",
            "calories": "约450大卡",
            "protein": "20g",
            "carbs": "60g",
            "fat": "15g"
          },
          "lunch": {
            "content": "糙米饭1碗，清蒸鸡胸肉100g，西兰花100g，胡萝卜50g",
            "calories": "约500大卡",
            "protein": "30g",
            "carbs": "70g",
            "fat": "10g"
          },
          "dinner": {
            "content": "燕麦粥1碗，水煮鱼100g，菠菜100g，豆腐50g",
            "calories": "约400大卡",
            "protein": "25g",
            "carbs": "50g",
            "fat": "10g"
          },
          "snacks": {
            "content": "苹果1个，无糖酸奶1杯，混合坚果30g",
            "calories": "约300大卡",
            "protein": "10g",
            "carbs": "30g",
            "fat": "15g"
          }
        }
      },
      // 其他日期...
    ]
  },
  "analysis": "用户分析和建议...",
  "dailyNutrition": {
    "calories": "约1800-2200大卡",
    "protein": "120-150g",
    "carbs": "200-250g",
    "fat": "50-70g"
  },
  "notes": "综合建议和注意事项..."
}
\`\`\`

请确保：
1. 训练计划和饮食计划相互配合，支持用户的健身目标
2. 每周安排4-5天训练，合理安排休息日
3. 每天的饮食计划与当天的训练内容相匹配
4. 所有日期（周一至周日）都必须包含在计划中
5. 提供简短的用户分析和综合建议

请只返回JSON格式的完整计划，不要包含其他解释性文字。`; 