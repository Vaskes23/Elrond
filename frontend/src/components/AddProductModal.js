import React, { useState } from 'react';
import { Dialog, Button, FormGroup, InputGroup, TextArea, RadioGroup, Radio, ProgressBar, Icon } from '@blueprintjs/core';
import { ChevronRight, ChevronLeft, Tick, Package } from '@blueprintjs/icons';
import './AddProductModal.css';

function AddProductModal({ onClose, onAddProduct }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'steel',
        material: '',
        dimensions: '',
        intendedUse: '',
        origin: '',
        manufacturer: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalSteps = 5;

    const categories = [
        { value: 'steel', label: 'Steel/Metal', icon: 'M' },
        { value: 'plastic', label: 'Plastic', icon: 'P' },
        { value: 'electronic', label: 'Electronic', icon: 'E' },
        { value: 'textile', label: 'Textile', icon: 'T' },
        { value: 'chemical', label: 'Chemical', icon: 'C' },
        { value: 'other', label: 'Other', icon: 'O' }
    ];

    const nextStep = () => {
        console.log('Next step clicked. Current step:', currentStep, 'Total steps:', totalSteps);
        console.log('Is current step valid?', isStepValid(currentStep));

        if (currentStep < totalSteps && isStepValid(currentStep)) {
            console.log('Moving to next step:', currentStep + 1);
            setCurrentStep(currentStep + 1);
        } else {
            console.log('Cannot move to next step. Validation failed or at last step.');
        }
    };

    const prevStep = () => {
        console.log('Previous step clicked. Current step:', currentStep);
        if (currentStep > 1) {
            console.log('Moving to previous step:', currentStep - 1);
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        onAddProduct(formData);
        setFormData({
            name: '',
            description: '',
            category: 'steel',
            material: '',
            dimensions: '',
            intendedUse: '',
            origin: '',
            manufacturer: ''
        });
        setCurrentStep(1);
        setIsSubmitting(false);
    };

    const isStepValid = (step) => {
        let isValid = false;
        switch (step) {
            case 1:
                isValid = formData.name.trim() !== '';
                break;
            case 2:
                isValid = formData.description.trim() !== '';
                break;
            case 3:
                isValid = formData.category !== '';
                break;
            case 4:
                isValid = formData.material.trim() !== '';
                break;
            case 5:
                isValid = true; // Final step is always valid
                break;
            default:
                isValid = false;
        }
        console.log(`Step ${step} validation:`, isValid, formData);
        return isValid;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h3>What is the product name?</h3>
                            <p>Enter a clear, descriptive name for your product</p>
                        </div>
                        <FormGroup>
                            <InputGroup
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Steel bolts for construction"
                                disabled={isSubmitting}
                                autoFocus
                                large
                            />
                        </FormGroup>
                    </div>
                );

            case 2:
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h3>Describe the product</h3>
                            <p>Provide detailed information about what this product is and how it's used</p>
                        </div>
                        <FormGroup>
                            <TextArea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the product's appearance, function, and typical applications..."
                                rows={4}
                                disabled={isSubmitting}
                                autoFocus
                                fill
                            />
                        </FormGroup>
                    </div>
                );

            case 3:
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h3>Select product category</h3>
                            <p>Choose the most appropriate category for your product</p>
                        </div>
                        <FormGroup>
                            <RadioGroup
                                name="category"
                                selectedValue={formData.category}
                                onChange={(e) => handleChange({ target: { name: 'category', value: e.currentTarget.value } })}
                                disabled={isSubmitting}
                            >
                                {categories.map((category) => (
                                    <Radio key={category.value} value={category.value} label={category.label}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                            <div
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {category.icon}
                                            </div>
                                        </div>
                                    </Radio>
                                ))}
                            </RadioGroup>
                        </FormGroup>
                    </div>
                );

            case 4:
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h3>What materials is it made of?</h3>
                            <p>Specify the primary materials used in this product</p>
                        </div>
                        <FormGroup label="Material" labelFor="material">
                            <InputGroup
                                id="material"
                                name="material"
                                value={formData.material}
                                onChange={handleChange}
                                placeholder="e.g., Carbon steel, Stainless steel, Aluminum..."
                                disabled={isSubmitting}
                                autoFocus
                                large
                            />
                        </FormGroup>
                        <FormGroup label="Dimensions (optional)" labelFor="dimensions">
                            <InputGroup
                                id="dimensions"
                                name="dimensions"
                                value={formData.dimensions}
                                onChange={handleChange}
                                placeholder="e.g., M8 x 20mm, 100mm x 50mm x 25mm..."
                                disabled={isSubmitting}
                                large
                            />
                        </FormGroup>
                    </div>
                );

            case 5:
                return (
                    <div className="step-content">
                        <div className="step-header">
                            <h3>Additional information</h3>
                            <p>Provide any additional details that might help with classification</p>
                        </div>
                        <FormGroup label="Intended Use" labelFor="intendedUse">
                            <InputGroup
                                id="intendedUse"
                                name="intendedUse"
                                value={formData.intendedUse}
                                onChange={handleChange}
                                placeholder="e.g., Construction, Automotive, Electronics..."
                                disabled={isSubmitting}
                                large
                            />
                        </FormGroup>
                        <FormGroup label="Country of Origin" labelFor="origin">
                            <InputGroup
                                id="origin"
                                name="origin"
                                value={formData.origin}
                                onChange={handleChange}
                                placeholder="e.g., Germany, China, USA..."
                                disabled={isSubmitting}
                                large
                            />
                        </FormGroup>
                        <FormGroup label="Manufacturer (optional)" labelFor="manufacturer">
                            <InputGroup
                                id="manufacturer"
                                name="manufacturer"
                                value={formData.manufacturer}
                                onChange={handleChange}
                                placeholder="e.g., Bosch, Siemens, Generic..."
                                disabled={isSubmitting}
                                large
                            />
                        </FormGroup>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon={<Package />} iconSize={20} />
                    Add New Product
                </div>
            }
            style={{ width: '600px' }}
            canOutsideClickClose={false}
            canEscapeKeyClose={false}
        >
            <div className="step-progress">
                <ProgressBar
                    value={currentStep / totalSteps}
                    intent="primary"
                    style={{ marginBottom: '16px' }}
                />
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <strong>Step {currentStep} of {totalSteps}</strong>
                </div>
            </div>

            <div className="modal-form">
                {renderStep()}

                <div className="form-actions">
                    {currentStep > 1 && (
                        <Button
                            icon={<ChevronLeft />}
                            text="Back"
                            onClick={prevStep}
                            disabled={isSubmitting}
                            outlined
                        />
                    )}

                    {currentStep < totalSteps ? (
                        <Button
                            icon={<ChevronRight />}
                            text="Next"
                            onClick={nextStep}
                            disabled={!isStepValid(currentStep) || isSubmitting}
                            intent="primary"
                            style={{ marginLeft: 'auto' }}
                        />
                    ) : (
                        <Button
                            icon={<Tick />}
                            text={isSubmitting ? "Adding Product..." : "Add Product"}
                            onClick={handleSubmit}
                            disabled={!isStepValid(currentStep) || isSubmitting}
                            intent="success"
                            loading={isSubmitting}
                            style={{ marginLeft: 'auto' }}
                        />
                    )}
                </div>
            </div>
        </Dialog>
    );
}

export default AddProductModal;