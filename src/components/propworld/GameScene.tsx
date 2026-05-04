import CosmicEnvironment, { ImpactBursts } from "./CosmicEnvironment";

interface Props {
  isMobile?: boolean;
}

export default function GameScene({ isMobile = false }: Props) {
  return (
    <group>
      <CosmicEnvironment
        isMobile={isMobile}
        onHittableHover={(h) => {
          window.dispatchEvent(new CustomEvent("cosmic:hover", { detail: h }));
        }}
      />
      <ImpactBursts />
    </group>
  );
}
