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
/*  Filtre d'époque affichée (1933 / 2025-2026 / les deux)             */
/*  Partagé par Chance, Santé Mentale et Bonds : choisi une fois,      */
/*  il s'applique aux trois fenêtres. Mémorisé pour chaque utilisateur.*/
/* ------------------------------------------------------------------ */
const ERA_FILTER_KEY = "eraFilter";
const ERA_FILTERS = ["1933", "modern", "all"];

function eraFilterScope() {
  return game.modules.get("coc7-luck-tracker")?.active ? "coc7-luck-tracker" : MODULE_ID;
}

function getEraFilter() {
  let value;
  try { value = game.user.getFlag(eraFilterScope(), ERA_FILTER_KEY); } catch (err) { value = null; }
  return ERA_FILTERS.includes(value) ? value : "all";
}

/** Une époque est affichée si elle correspond au filtre ; les non-assignés restent toujours visibles. */
function isEraShown(eraKey, filter) {
  return filter === "all" || eraKey === filter || eraKey === "unassigned";
}


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
    position: { width: 440, height: 680 },
    actions: {
      refresh: BondsTrackerApp.onRefresh,
      setEraFilter: BondsTrackerApp.onSetEraFilter,
      toggleBond: BondsTrackerApp.onToggleBond,
      deleteBond: BondsTrackerApp.onDeleteBond
    }
  };

  static PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/bonds-tracker.hbs`,
      // la liste défile dans la fenêtre ; la position est conservée à chaque mise à jour
      scrollable: [""]
    }
  };

  /** @override */
  async _prepareContext(_options) {
    const rawActors = getTrackedActors();
    const eraFilter = getEraFilter();

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
    })).filter((g) => g.actors.length > 0 && isEraShown(g.key, eraFilter));

    return {
      groups,
      hasActors: rawActors.length > 0,
      filteredEmpty: rawActors.length > 0 && groups.length === 0,
      eraFilters: [
        { key: "1933", label: "COC7BONDS.Filter1933", active: eraFilter === "1933" },
        { key: "modern", label: "COC7BONDS.FilterModern", active: eraFilter === "modern" },
        { key: "all", label: "COC7BONDS.FilterAll", active: eraFilter === "all" }
      ]
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

  static async onSetEraFilter(_event, target) {
    const era = target.dataset.era;
    if (!ERA_FILTERS.includes(era)) return;
    try {
      await game.user.setFlag(eraFilterScope(), ERA_FILTER_KEY, era);
    } catch (err) {
      console.error(`${MODULE_ID} | impossible d'enregistrer le filtre d'époque`, err);
    }
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
Hooks.on("updateUser", (user, changes) => {
  if (user.id !== game.user.id || !changes?.flags) return;
  if (appInstance?.rendered) appInstance.render();
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
