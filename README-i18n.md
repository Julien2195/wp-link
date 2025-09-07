# Système de traductions i18n

Ce projet utilise `react-i18next` pour l'internationalisation (i18n). Les langues supportées sont le français (fr) et l'anglais (en).

## Configuration

### Langues supportées
- **Français (fr)** : Langue par défaut pour les sites WordPress en français
- **Anglais (en)** : Langue par défaut pour tous les autres sites

### Détection automatique de la langue
La langue est automatiquement détectée depuis les paramètres WordPress :
- Si la langue WordPress commence par "fr" → français
- Sinon → anglais

### Persistance
Le choix de langue de l'utilisateur est sauvegardé dans `localStorage` sous la clé `wpls.language`.

## Structure des fichiers

```
src/
├── i18n/
│   ├── index.js              # Configuration i18next
│   └── locales/
│       ├── fr.json           # Traductions françaises
│       └── en.json           # Traductions anglaises
└── components/
    └── LanguageSelector.jsx  # Sélecteur de langue avec drapeaux
```

## Utilisation dans les composants

### Import du hook de traduction
```javascript
import { useTranslation } from 'react-i18next';

function MonComposant() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <p>{t('dashboard.description')}</p>
    </div>
  );
}
```

### Traductions avec paramètres
```javascript
// Dans le fichier JSON
{
  "welcome": "Bienvenue {{name}} !",
  "items": "{{count}} élément_0",
  "items_one": "{{count}} élément", 
  "items_other": "{{count}} éléments"
}

// Dans le composant
<p>{t('welcome', { name: 'Jean' })}</p>
<p>{t('items', { count: 5 })}</p>
```

### Changement de langue
```javascript
const { i18n } = useTranslation();

// Changer la langue
i18n.changeLanguage('en');

// Langue actuelle
console.log(i18n.language); // 'fr' ou 'en'
```

## Organisation des clés de traduction

Les traductions sont organisées par section :

```json
{
  "common": {
    "loading": "Chargement...",
    "save": "Enregistrer",
    "cancel": "Annuler"
  },
  "navigation": {
    "dashboard": "Tableau de bord",
    "history": "Historique",
    "settings": "Paramètres"
  },
  "dashboard": {
    "title": "Tableau de bord",
    "scanForm": {
      "title": "Scanner les liens",
      "startScan": "Démarrer le scan"
    }
  }
}
```

## Composant LanguageSelector

Le sélecteur de langue affiche des drapeaux et permet de basculer entre les langues :

```jsx
import LanguageSelector from './components/LanguageSelector';

// Utilisation
<LanguageSelector />
```

## Ajout d'une nouvelle langue

1. Créer un nouveau fichier de traduction : `src/i18n/locales/es.json`
2. Ajouter la langue dans la configuration : `src/i18n/index.js`
3. Ajouter la langue dans le sélecteur : `src/components/LanguageSelector.jsx`

## Bonnes pratiques

### Nommage des clés
- Utiliser la notation point : `section.subsection.key`
- Être descriptif : `button.save` plutôt que `btn.s`
- Grouper par fonctionnalité

### Traductions plurielles
```json
{
  "items_0": "{{count}} item",
  "items_one": "{{count}} item",
  "items_other": "{{count}} items"
}
```

### Fallbacks
Toujours fournir un fallback pour les clés manquantes :
```javascript
t('cle.inexistante', 'Texte par défaut')
```

### Contexte
Fournir du contexte dans les commentaires JSON :
```json
{
  "_comment": "Boutons d'action pour les scans",
  "startScan": "Démarrer le scan",
  "stopScan": "Arrêter le scan"
}
```

## Débogage

Activer le mode debug en développement dans `src/i18n/index.js` :
```javascript
i18n.init({
  debug: process.env.NODE_ENV === 'development',
  // ...
});
```

Cela affichera les clés manquantes et autres informations utiles dans la console.
