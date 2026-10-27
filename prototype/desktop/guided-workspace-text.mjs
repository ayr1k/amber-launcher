// SPDX-License-Identifier: MPL-2.0
export const workspaceText={
  "invalidDraft": [
    "草稿格式无效，当前输入已保留。请重试保存。",
    "The draft is invalid. Your current input is retained. Retry saving."
  ],
  "invalidTemplate": [
    "模板内容或名称无效。",
    "Invalid template data or name."
  ],
  "templateLimit": [
    "最多保存 20 份本地模板，请先删除不需要的模板。",
    "Up to 20 local templates are supported. Remove an unused template first."
  ],
  "templateDuplicate": [
    "已有同名模板，请使用其他名称。",
    "A template with this name already exists. Choose another name."
  ],
  "generationBusy": [
    "上一轮检查尚在结束，请稍候重试。",
    "The previous check is still finishing. Retry shortly."
  ],
  "generationCancelled": [
    "已取消生成，填写内容已保留。",
    "Generation cancelled. Your answers are retained."
  ],
  "generationLimited": [
    "内容服务暂时限流。填写内容已保留，请稍后重新生成。",
    "The content service is rate-limited. Your answers are retained. Retry later."
  ],
  "generationNetwork": [
    "未能完整读取兼容信息，不能据此判断模组不兼容。请检查网络后重试。",
    "Compatibility information could not be fully retrieved. This does not mean the mods are incompatible. Check the connection and retry."
  ],
  "phase_versions": [
    "正在读取游戏版本与环境…",
    "Reading game versions and environment…"
  ],
  "phase_matching": [
    "正在匹配功能与模组版本…",
    "Matching features and mod releases…"
  ],
  "phase_dependencies": [
    "正在核对依赖与冲突…",
    "Checking dependencies and conflicts…"
  ],
  "phase_visuals": [
    "正在核对光影与远景组合…",
    "Checking shader and distant-terrain combinations…"
  ],
  "phase_cancelled": [
    "正在结束取消的检查…",
    "Finishing the cancelled check…"
  ],
  "cancelGeneration": [
    "取消生成",
    "Cancel generation"
  ],
  "advancedServer": [
    "高级：指定加载器版本",
    "Advanced: exact loader version"
  ],
  "advancedContent": [
    "高级：指定必装模组",
    "Advanced: required projects"
  ],
  "advancedBudget": [
    "高级：下载与磁盘预算",
    "Advanced: download and disk budgets"
  ],
  "advancedHardware": [
    "高级：画面与远景选项",
    "Advanced: visuals and distant terrain"
  ],
  "editFullList": [
    "编辑完整清单与依赖",
    "Edit the full list and dependencies"
  ],
  "autosaved": [
    "草稿已自动保存",
    "Draft saved automatically"
  ],
  "savingDraft": [
    "正在保存草稿…",
    "Saving draft…"
  ],
  "restoreDraft": [
    "已恢复上次选择。生成方案后会重新核验兼容性。",
    "Previous choices restored. Generating a setup will recheck compatibility."
  ],
  "refreshPlan": [
    "保留选择，重新核验方案",
    "Keep choices and recheck setup"
  ],
  "expiredPlan": [
    "方案已过期。已保留填写内容，请重新核验后确认变化。",
    "This setup expired. Your input is retained. Recheck it and review the changes."
  ],
  "refreshChoices": [
    "已尝试保留依赖选择；不同文件版本的依赖需要重新确认。",
    "Dependency choices were retained where possible. Dependencies of different file versions need a new review."
  ],
  "profileChanged": [
    "游戏版本或加载器与刚才不同，请检查后再安装。",
    "The game version or loader differs from your previous choice. Review before installing."
  ],
  "templates": [
    "本地推荐模板",
    "Local recommendation templates"
  ],
  "templateNote": [
    "仅保存需求与偏好，不保存账号、路径或旧安装文件。使用时重新匹配兼容版本；补装仍受当前实例限制。",
    "Stores preferences only, without accounts, paths or old installation files. Compatibility is checked again on use; additions remain constrained by the current instance."
  ],
  "templateSaved": [
    "已保存模板",
    "Saved templates"
  ],
  "templateChoose": [
    "选择模板",
    "Choose a template"
  ],
  "templateApply": [
    "应用模板",
    "Apply template"
  ],
  "templateDelete": [
    "删除模板",
    "Delete template"
  ],
  "templateDeleteQuestion": [
    "删除这份本地模板？不会删除实例或存档。",
    "Delete this local template? Instances and worlds are unaffected."
  ],
  "templateDeleteConfirm": [
    "确认删除模板",
    "Confirm template deletion"
  ],
  "templateKeep": [
    "保留模板",
    "Keep template"
  ],
  "templateName": [
    "新模板名称",
    "New template name"
  ],
  "templateSave": [
    "将当前偏好保存为模板",
    "Save current preferences as template"
  ],
  "templateSavedNotice": [
    "模板已保存到本机。",
    "Template saved locally."
  ],
  "templateApplied": [
    "已应用模板。请检查偏好，再生成推荐。",
    "Template applied. Review preferences before generating a setup."
  ],
  "tierDifferences": [
    "当前档位与其他档位的差异",
    "How this tier differs"
  ],
  "tierCommon": [
    "三档共同内容",
    "Content shared by all tiers"
  ],
  "noUniqueFeatures": [
    "此档位没有额外的独有内容；请结合玩法改动和资源负担选择。",
    "This tier has no additional unique content. Compare gameplay changes and resource load."
  ],
  "refreshChanges": [
    "与上次清单相比",
    "Changes from the previous list"
  ],
  "refreshSame": [
    "文件清单没有变化。",
    "The file list is unchanged."
  ],
  "refreshReview": [
    "以下内容已变化，请重新确认。不会自动安装。",
    "The following content changed. Review it again; installation is not automatic."
  ],
  "refreshRemoved": [
    "本次未加入",
    "Not included this time"
  ],
  "satisfied": [
    "已满足／保留原版本",
    "Already present / keep current versions"
  ],
  "disabledContent": [
    "保持停用",
    "Keep disabled"
  ],
  "conflictGroup": [
    "冲突与需要处理的问题",
    "Conflicts and issues to resolve"
  ],
  "noConflicts": [
    "未发现已声明的冲突；仍需实际游戏验证。",
    "No declared conflicts found; actual gameplay still needs validation."
  ],
  "aftercare": [
    "安装后的配置指引",
    "Post-install setup guide"
  ],
  "aftercareNote": [
    "这是配置说明，不代表已实测游戏运行。修改画面设置后请在游戏中确认效果。",
    "This is configuration guidance, not gameplay verification. Confirm visual changes in game."
  ],
  "aftercareMods": [
    "在内容管理中查看本次安装的模组；有模组菜单时，可在游戏内查找配置入口。",
    "Review installed mods in content management. If a mod menu is present, look for configuration entries in game."
  ],
  "aftercareVisualExisting": [
    "保留原有光影配置，请在游戏内确认启用状态",
    "Existing shader settings are preserved. Check their enabled state in game"
  ],
  "aftercareVisualCheck": [
    "在游戏的视频／光影设置中确认所选光影与预设",
    "Confirm the selected shader and preset in the game video/shader settings"
  ],
  "aftercareResources": [
    "资源包需要在游戏的“资源包”设置中启用，下载完成不等于已经启用。",
    "Enable resource packs in the game Resource Packs settings; a download does not enable them."
  ],
  "aftercareDH": [
    "Distant Horizons：在模组设置中检查远景距离。首次生成远景可能占用较多处理器和磁盘资源，可先从较低距离开始。",
    "Distant Horizons: check distant-terrain distance in its settings. Initial generation can use substantial CPU and disk resources; start with a shorter distance."
  ],
  "aftercareVoxy": [
    "Voxy：在模组设置中检查远景与光影状态。若出现异常，先停用远景进行排查，保留存档与原有配置。",
    "Voxy: check distant-terrain and shader settings. If problems appear, disable distant terrain first for diagnosis, preserving worlds and configuration."
  ],
  "aftercareContent": [
    "查看已安装内容",
    "View installed content"
  ],
  "aftercareHistory": [
    "查看恢复记录",
    "View recovery history"
  ],
  "aftercareFolder": [
    "打开实例文件夹",
    "Open instance folder"
  ],
  "omitted": [
    "未加入（无兼容文件、停用或受偏好限制）：",
    "Not included (no compatible file, disabled or excluded by preferences):"
  ]
};
