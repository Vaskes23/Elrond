import React, { useEffect, useRef } from 'react';
import Globe from 'globe.gl';

interface GlobeBackgroundProps {
    className?: string;
}

const GlobeBackground: React.FC<GlobeBackgroundProps> = ({ className }) => {
    const globeRef = useRef<HTMLDivElement>(null);
    const globeInstance = useRef<any>(null);

    useEffect(() => {
        if (!globeRef.current) return;

        // Initialize globe
        globeInstance.current = new Globe(globeRef.current)
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
            .enablePointerInteraction(false);

        // Auto-rotate
        globeInstance.current.controls().autoRotate = true;
        globeInstance.current.controls().autoRotateSpeed = 0.5;
        globeInstance.current.controls().enableZoom = false;
        globeInstance.current.controls().enablePan = false;

        // Create sample routes directly for better performance and consistency
        const sampleRoutes = [
            // Major international routes
            { startLat: 40.7128, startLng: -74.0060, endLat: 51.5074, endLng: -0.1278 }, // NYC to London
            { startLat: 35.6762, startLng: 139.6503, endLat: 40.7128, endLng: -74.0060 }, // Tokyo to NYC
            { startLat: -33.8688, startLng: 151.2093, endLat: 35.6762, endLng: 139.6503 }, // Sydney to Tokyo
            { startLat: 55.7558, startLng: 37.6176, endLat: 48.8566, endLng: 2.3522 }, // Moscow to Paris
            { startLat: 39.9042, startLng: 116.4074, endLat: 55.7558, endLng: 37.6176 }, // Beijing to Moscow
            { startLat: 25.2048, startLng: 55.2708, endLat: 40.7128, endLng: -74.0060 }, // Dubai to NYC
            { startLat: 1.3521, startLng: 103.8198, endLat: 51.5074, endLng: -0.1278 }, // Singapore to London
            { startLat: -34.6037, startLng: -58.3816, endLat: 40.7128, endLng: -74.0060 }, // Buenos Aires to NYC
            { startLat: 52.5200, startLng: 13.4050, endLat: 35.6762, endLng: 139.6503 }, // Berlin to Tokyo
            { startLat: 37.7749, startLng: -122.4194, endLat: -33.8688, endLng: 151.2093 }, // SF to Sydney
            { startLat: 55.7558, startLng: 37.6176, endLat: 25.2048, endLng: 55.2708 }, // Moscow to Dubai
            { startLat: 39.9042, startLng: 116.4074, endLat: 1.3521, endLng: 103.8198 }, // Beijing to Singapore
            { startLat: 28.6139, startLng: 77.2090, endLat: 51.5074, endLng: -0.1278 }, // Delhi to London
            { startLat: -26.2041, startLng: 28.0473, endLat: 25.2048, endLng: 55.2708 }, // Johannesburg to Dubai
            { startLat: 59.9139, startLng: 10.7522, endLat: 40.7128, endLng: -74.0060 }, // Oslo to NYC
        ];

        globeInstance.current
            .arcsData(sampleRoutes)
            .arcColor(() => 'rgba(255, 255, 255, 0.3)')
            .arcDashLength(0.4)
            .arcDashGap(0.2)
            .arcDashAnimateTime(2000)
            .arcStroke(0.5);

        // Set camera position
        globeInstance.current.pointOfView({ altitude: 2 });

        // Handle window resize
        const handleResize = () => {
            if (globeInstance.current && globeRef.current) {
                globeInstance.current
                    .width(globeRef.current.offsetWidth)
                    .height(globeRef.current.offsetHeight);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (globeInstance.current) {
                // Clean up globe instance
                try {
                    globeInstance.current._destructor && globeInstance.current._destructor();
                } catch (e) {
                    console.warn('Globe cleanup warning:', e);
                }
            }
        };
    }, []);

    return (
        <div
            ref={globeRef}
            className={className}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
                pointerEvents: 'none'
            }}
        />
    );
};

export default GlobeBackground;
