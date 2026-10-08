/**
 * CoC7 – Suivi des Bonds du groupe
 * Ajoute un bouton dans les contrôles de scène (barre gauche) qui ouvre
 * une fenêtre listant les Bonds (Liens) de tous les investigateurs
 * joueurs, regroupés par époque, avec ajout/rupture/suppression en direct.
 */

const MODULE_ID = "coc7-bonds-tracker";
const BONDS_FLAG_KEY = "bonds";

/* L'affectation d'époque est partagée avec les modules Chance/Santé Mentale */
const ERA_FLAG_MODULE = "coc7-luck-tracker";
const ERA_FLAG_KEY = "era";

const ERA_DEFS = [
  { key: "1933", label: "COC7BONDS.Era1933", sub: "MCMXXXIII" },
  { key: "modern", label: "COC7BONDS.EraModern", sub: "MMXXV \u2013 MMXXVI" },
  { key: "unassigned", label: "COC7BONDS.EraUnassigned", sub: null }
];

/* ------------------------------------------------------------------ */
/*  Lecture / écriture des Bonds sur une fiche d'acteur                */
/* ------------------------------------------------------------------ */
function getBonds(docActor) {
  const bonds = docActor.getFlag(MODULE_ID, BONDS_FLAG_KEY);
  return Array.isArray(bonds) ? bonds : [];
}

async function setBonds(docActor, bonds) {
  await docActor.setFlag(MODULE_ID, BONDS_FLAG_KEY, bonds);
}

async function addBond(actorId, name, note) {
  const docActor = game.actors.get(actorId);
  const trimmedName = (name ?? "").trim();
  if (!docActor || !trimmedName) return;
  const bonds = getBonds(docActor);
  bonds.push({
    id: foundry.utils.randomID(),
    name: trimmedName,
    note: (note ?? "").trim(),
    broken: false
  });
  await setBonds(docActor, bonds);
}

async function toggleBond(actorId, bondId) {
  const docActor = game.actors.get(actorId);
  if (!docActor) return;
  const bonds = getBonds(docActor);
  const bond = bonds.find((b) => b.id === bondId);
  if (!bond) return;
  bond.broken = !bond.broken;
  await setBonds(docActor, bonds);
}

async function deleteBond(actorId, bondId) {
  const docActor = game.actors.get(actorId);
  if (!docActor) return;
  const bonds = getBonds(docActor).filter((b) => b.id !== bondId);
  await setBonds(docActor, bonds);
}

/* ------------------------------------------------------------------ */
/*  Récupération des personnages joueurs                               */
/* ------------------------------------------------------------------ */
function getActorEra(docActor) {
  const era = docActor.getFlag(ERA_FLAG_MODULE, ERA_FLAG_KEY);
  return ERA_DEFS.some((d) => d.key === era) ? era : "unassigned";
}

function getTrackedActors() {
  return game.actors
    .filter((docActor) => docActor.type === "character" && docActor.hasPlayerOwner)
    .map((docActor) => {
      const bonds = getBonds(docActor);
      return {
        id: docActor.id,
        name: docActor.name,
        img: docActor.img || "icons/svg/mystery-man.svg",
        era: getActorEra(docActor),
        bonds,
        intactCount: bonds.filter((b) => !b.broken).length,
        totalCount: bonds.length
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/* ------------------------------------------------------------------ */
/*  Fenêtre d'affichage (ApplicationV2)                                */
/* ------------------------------------------------------------------ */
class BondsTrackerApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "coc7-bonds-tracker-app",
    tag: "div",
    window: {
      title: "COC7BONDS.WindowTitle",
      icon: "fa-solid fa-link",
      resizable: true
    },
    position: { width: 420, height: "auto" },
    actions: {
      refresh: BondsTrackerApp.onRefresh,
      toggleBond: BondsTrackerApp.onToggleBond,
      deleteBond: BondsTrackerApp.onDeleteBond
    }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/bonds-tracker.hbs` }
  };

  /** @override */
  async _prepareContext(_options) {
    const rawActors = getTrackedActors();

    const groupsMap = new Map(ERA_DEFS.map((d) => [d.key, []]));
    for (const a of rawActors) {
      groupsMap.get(a.era).push(a);
    }

    const groups = ERA_DEFS.map((def) => ({
      key: def.key,
      cssKey: `era-${def.key}`,
      label: def.label,
      sub: def.sub,
      actors: groupsMap.get(def.key) ?? []
    })).filter((g) => g.actors.length > 0);

    return {
      groups,
      hasActors: rawActors.length > 0
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll(".coc7-bond-add-form").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const actorId = form.dataset.actorId;
        const nameInput = form.querySelector(".coc7-bond-input-name");
        const noteInput = form.querySelector(".coc7-bond-input-note");
        await addBond(actorId, nameInput.value, noteInput.value);
        nameInput.value = "";
        noteInput.value = "";
        // Le hook updateActor rafraîchit automatiquement la fenêtre.
      });
    });
  }

  static onRefresh(_event, _target) {
    this.render();
  }

  static async onToggleBond(_event, target) {
    await toggleBond(target.dataset.actorId, target.dataset.bondId);
  }

  static async onDeleteBond(_event, target) {
    await deleteBond(target.dataset.actorId, target.dataset.bondId);
  }
}

/* ------------------------------------------------------------------ */
/*  Instance unique + bascule ouverture/fermeture                      */
/* ------------------------------------------------------------------ */
let appInstance = null;

function toggleBondsTracker() {
  if (appInstance?.rendered) {
    appInstance.close();
    return;
  }
  appInstance = new BondsTrackerApp();
  appInstance.render({ force: true });
}

/* ------------------------------------------------------------------ */
/*  Rafraîchissement automatique quand une fiche change                */
/* ------------------------------------------------------------------ */
Hooks.on("updateActor", (actor) => {
  if (appInstance?.rendered && actor.type === "character") appInstance.render();
});
Hooks.on("createActor", (actor) => {
  if (appInstance?.rendered && actor.type === "character") appInstance.render();
});
Hooks.on("deleteActor", (actor) => {
  if (appInstance?.rendered && actor.type === "character") appInstance.render();
});

/* ------------------------------------------------------------------ */
/*  Bouton dans la barre de contrôles de scène (barre latérale gauche) */
/* ------------------------------------------------------------------ */
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControl = controls.tokens;
  if (!tokenControl?.tools) return;

  tokenControl.tools.bondsTracker = {
    name: "bondsTracker",
    title: "COC7BONDS.ButtonTitle",
    icon: "fa-solid fa-link",
    order: Object.keys(tokenControl.tools).length,
    button: true,
    visible: game.user.isGM,
    onChange: () => toggleBondsTracker()
  };
});
