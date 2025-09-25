Compiled with problems:
×
ERROR in src/components/GlobeBackground.tsx:16:33
TS2348: Value of type 'new (element: HTMLElement, configOptions?: ConfigOptions | undefined) => GlobeInstance' is not callable. Did you mean to include 'new'?
    14 |
    15 |         // Initialize globe
  > 16 |         globeInstance.current = Globe()
       |                                 ^^^^^^^
    17 |             .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
    18 |             .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    19 |             .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
ERROR in src/components/LandingPage.tsx:47:26
TS2786: 'Icon' cannot be used as a JSX component.
  Its return type 'ReactNode' is not a valid JSX element.
    45 |                         justifyContent: 'center'
    46 |                     }}>
  > 47 |                         <Icon icon="globe" size={16} style={{ color: '#000' }} />
       |                          ^^^^
    48 |                     </div>
    49 |                     <Text style={{
    50 |                         fontSize: '18px',
ERROR in src/components/LandingPage.tsx:68:26
TS2786: 'Icon' cannot be used as a JSX component.
  Its return type 'ReactNode' is not a valid JSX element.
    66 |                 }}>
    67 |                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  > 68 |                         <Icon icon="search" size={14} style={{ color: '#999' }} />
       |                          ^^^^
    69 |                         <Text style={{ color: '#999', fontSize: '14px' }}>Search targets...</Text>
    70 |                     </div>
    71 |                 </div>
ERROR in src/components/LandingPage.tsx:239:22
TS2786: 'Icon' cannot be used as a JSX component.
  Its return type 'ReactNode' is not a valid JSX element.
    Type 'undefined' is not assignable to type 'Element | null'.
    237 |                 <Text>410.JB 98556 92748</Text>
    238 |                 <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
  > 239 |                     <Icon icon="warning-sign" size={12} />
        |                      ^^^^
    240 |                     <Icon icon="cog" size={12} />
    241 |                     <Icon icon="info-sign" size={12} />
    242 |                 </div>
ERROR in src/components/LandingPage.tsx:240:22
TS2786: 'Icon' cannot be used as a JSX component.
  Its return type 'ReactNode' is not a valid JSX element.
    238 |                 <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    239 |                     <Icon icon="warning-sign" size={12} />
  > 240 |                     <Icon icon="cog" size={12} />
        |                      ^^^^
    241 |                     <Icon icon="info-sign" size={12} />
    242 |                 </div>
    243 |             </div>
ERROR in src/components/LandingPage.tsx:241:22
TS2786: 'Icon' cannot be used as a JSX component.
  Its return type 'ReactNode' is not a valid JSX element.
    239 |                     <Icon icon="warning-sign" size={12} />
    240 |                     <Icon icon="cog" size={12} />
  > 241 |                     <Icon icon="info-sign" size={12} />
        |                      ^^^^
    242 |                 </div>
    243 |             </div>
    244 |