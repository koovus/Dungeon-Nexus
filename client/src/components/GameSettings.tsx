import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

export interface EntityDefinition {
  id: string;
  char: string;
  name: string;
  color: string;
  type: 'enemy' | 'item';
}

export const defaultEnemyTypes: EntityDefinition[] = [
  { id: 'e1', char: 'g', name: 'Goblin', color: 'text-enemy', type: 'enemy' },
  { id: 'e2', char: 'o', name: 'Orc', color: 'text-enemy', type: 'enemy' },
  { id: 'e3', char: 'T', name: 'Troll', color: 'text-enemy', type: 'enemy' },
  { id: 'e4', char: 'D', name: 'Dragon', color: 'text-enemy', type: 'enemy' }
];

export const defaultItemTypes: EntityDefinition[] = [
  { id: 'i1', char: '!', name: 'Health Potion', color: 'text-item', type: 'item' },
  { id: 'i2', char: '?', name: 'Magic Scroll', color: 'text-item', type: 'item' },
  { id: 'i3', char: '$', name: 'Gold', color: 'text-player', type: 'item' },
  { id: 'i4', char: ')', name: 'Sword', color: 'text-secondary', type: 'item' }
];

interface GameSettingsProps {
  onSettingsChange: (enemies: EntityDefinition[], items: EntityDefinition[]) => void;
}

export function GameSettings({ onSettingsChange }: GameSettingsProps) {
  const [open, setOpen] = useState(false);
  const [enemies, setEnemies] = useState<EntityDefinition[]>(defaultEnemyTypes);
  const [items, setItems] = useState<EntityDefinition[]>(defaultItemTypes);

  const handleSave = () => {
    onSettingsChange(enemies, items);
    setOpen(false);
  };

  const addEntity = (type: 'enemy' | 'item') => {
    const newEntity: EntityDefinition = {
      id: Math.random().toString(36).substring(7),
      char: 'X',
      name: 'New ' + (type === 'enemy' ? 'Monster' : 'Item'),
      color: type === 'enemy' ? 'text-enemy' : 'text-item',
      type
    };
    
    if (type === 'enemy') {
      setEnemies([...enemies, newEntity]);
    } else {
      setItems([...items, newEntity]);
    }
  };

  const updateEntity = (id: string, type: 'enemy' | 'item', field: keyof EntityDefinition, value: string) => {
    if (type === 'enemy') {
      setEnemies(enemies.map(e => e.id === id ? { ...e, [field]: value } : e));
    } else {
      setItems(items.map(e => e.id === id ? { ...e, [field]: value } : e));
    }
  };

  const removeEntity = (id: string, type: 'enemy' | 'item') => {
    if (type === 'enemy') {
      setEnemies(enemies.filter(e => e.id !== id));
    } else {
      setItems(items.filter(e => e.id !== id));
    }
  };

  const renderEntityList = (list: EntityDefinition[], type: 'enemy' | 'item') => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-primary uppercase tracking-wider">{type === 'enemy' ? 'Monsters' : 'Items'}</h4>
        <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/20" onClick={() => addEntity(type)}>
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {list.map((entity) => (
          <div key={entity.id} className="flex gap-2 items-end border border-primary/20 p-2 bg-background/50">
            <div className="w-16">
              <Label className="text-xs text-primary/70">Char</Label>
              <Input 
                value={entity.char} 
                onChange={(e) => updateEntity(entity.id, type, 'char', e.target.value.substring(0, 1))}
                className="font-mono text-center border-primary/50 bg-transparent text-primary"
                maxLength={1}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-primary/70">Name</Label>
              <Input 
                value={entity.name} 
                onChange={(e) => updateEntity(entity.id, type, 'name', e.target.value)}
                className="font-mono border-primary/50 bg-transparent text-primary"
              />
            </div>
            <div className="w-32">
              <Label className="text-xs text-primary/70">Color Class</Label>
              <Input 
                value={entity.color} 
                onChange={(e) => updateEntity(entity.id, type, 'color', e.target.value)}
                className="font-mono border-primary/50 bg-transparent text-primary text-xs"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-enemy hover:bg-enemy/20 hover:text-enemy"
              onClick={() => removeEntity(entity.id, type)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/20 font-mono crt-flicker">
          <SettingsIcon className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-background border-primary/50 text-primary font-mono crt">
        <DialogHeader>
          <DialogTitle className="text-xl uppercase tracking-widest text-primary border-b border-primary/30 pb-2">
            Game Configuration
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-8 py-4">
            <div className="text-sm text-primary/70 mb-4 bg-primary/10 p-3 border border-primary/30">
              Modify the entities that can spawn in the dungeon. Applying changes will restart the current game.
              <br/>Valid color classes: text-primary, text-secondary, text-enemy, text-item, text-player, etc.
            </div>
            
            {renderEntityList(enemies, 'enemy')}
            {renderEntityList(items, 'item')}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-4 border-t border-primary/30 pt-4 mt-4">
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/20" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="bg-primary text-background hover:bg-primary/80" onClick={handleSave}>
            Apply & Restart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}