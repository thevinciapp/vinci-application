"use client";

import React from "react";
import { AVAILABLE_MODELS } from "@/config/models";
import { ProviderIcon } from "@lobehub/icons";
import { ProviderComponentProps } from "../../types";

export const ModelsProvider: React.FC<ProviderComponentProps> = ({ searchQuery }) => {
  const filteredModels = Object.entries(AVAILABLE_MODELS)
    .flatMap(([provider, models]) =>
      models.filter(model =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(model => ({ ...model, provider }))
    );

  return (
    <div className="model-grid">
      {filteredModels.map((model, idx) => (
        <div key={idx} className="model-item">
          <ProviderIcon type="color" provider={model.provider} size={24} />
          <h4>{model.name}</h4>
          <p>{model.description}</p>
        </div>
      ))}
    </div>
  );
};
