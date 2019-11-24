package com.yogesh.automation.dataStructure;

import java.util.ArrayList;

public class ArrayCommonElements {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		ArrayCommonElements obj = new ArrayCommonElements();
		int[] arr1 = { 1, 2, 3, 4, 5 };
		int[] arr2 = { 3, 4, 5 };
		int[] arr3 = { 4, 5 };
		obj.commonElements(arr1, arr2, arr3);
	}

	public void commonElements(int[] arr1, int[] arr2, int[] arr3) {
		int i = 0;
		int j = 0;
		int k = 0;

		while (i < arr1.length && j < arr2.length && k < arr3.length) {
			if (arr1[i] == arr2[j] && arr2[j] == arr3[k]) {
				System.out.println(arr1[i] + " ");
				i++;
				j++;
				k++;
			} else if (arr1[i] < arr2[j]) {
				i++;
			} else if (arr2[j] < arr3[k]) {
				j++;
			} else {
				k++;
			}
		}
	}

}
